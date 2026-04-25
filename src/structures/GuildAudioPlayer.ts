import { EventEmitter } from 'events';
import { Snowflake, Client, Guild, VoiceBasedChannel, Events, Status, GuildTextBasedChannel } from 'discord.js';
import {
	AudioPlayer,
	AudioPlayerError,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	DiscordGatewayAdapterCreator,
	DiscordGatewayAdapterLibraryMethods,
	entersState,
	joinVoiceChannel,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import {
	GatewayDispatchEvents,
	GatewayVoiceServerUpdateDispatchData,
	GatewayVoiceStateUpdateDispatchData,
} from 'discord-api-types/v9';
import type { Track } from './Track';
import { promisify } from 'util';

const wait = promisify(setTimeout);

const adapters = new Map<Snowflake, DiscordGatewayAdapterLibraryMethods>();
const trackedClients = new Set<Client>();
const trackedShards = new Map<number, Set<Snowflake>>();

function trackClient(client: Client) {
	if (trackedClients.has(client)) return;
	trackedClients.add(client);
	client.ws.on(GatewayDispatchEvents.VoiceServerUpdate, (payload: GatewayVoiceServerUpdateDispatchData) => {
		adapters.get(payload.guild_id)?.onVoiceServerUpdate(payload);
	});
	client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (payload: GatewayVoiceStateUpdateDispatchData) => {
		if (payload.guild_id && payload.session_id && payload.user_id === client.user?.id) {
			adapters.get(payload.guild_id)?.onVoiceStateUpdate(payload);
		}
	});
	client.on(Events.ShardDisconnect, (_, shardId) => {
		const guilds = trackedShards.get(shardId);
		if (guilds) {
			for (const guildID of guilds.values()) {
				adapters.get(guildID)?.destroy();
			}
		}
		trackedShards.delete(shardId);
	});
}

function trackGuild(guild: Guild) {
	let guilds = trackedShards.get(guild.shardId);
	if (!guilds) {
		guilds = new Set();
		trackedShards.set(guild.shardId, guilds);
	}
	guilds.add(guild.id);
}

export function createDiscordJSAdapter(channel: VoiceBasedChannel): DiscordGatewayAdapterCreator {
	return (methods) => {
		adapters.set(channel.guild.id, methods);
		trackClient(channel.client);
		trackGuild(channel.guild);
		return {
			sendPayload(data) {
				if (channel.guild.shard.status === Status.Ready) {
					channel.guild.shard.send(data);
					return true;
				}
				return false;
			},
			destroy() {
				return adapters.delete(channel.guild.id);
			},
		};
	};
}

interface GuildAudioPlayerEvents {
	start: [track: Track, resource: AudioResource<Track>];
	finish: [track: Track];
	error: [track: Track | undefined, error: Error];
	idle: [];
	disconnect: [];
}

export declare interface GuildAudioPlayer {
	on<K extends keyof GuildAudioPlayerEvents>(event: K, listener: (...args: GuildAudioPlayerEvents[K]) => void): this;
	once<K extends keyof GuildAudioPlayerEvents>(event: K, listener: (...args: GuildAudioPlayerEvents[K]) => void): this;
	emit<K extends keyof GuildAudioPlayerEvents>(event: K, ...args: GuildAudioPlayerEvents[K]): boolean;
	off<K extends keyof GuildAudioPlayerEvents>(event: K, listener: (...args: GuildAudioPlayerEvents[K]) => void): this;
}

export class GuildAudioPlayer extends EventEmitter {
	public readonly voiceConnection: VoiceConnection;
	public readonly audioPlayer: AudioPlayer;
	public readonly textChannel: GuildTextBasedChannel;
	public queue: Track[];
	private queueLock = false;
	private readyLock = false;
	private destroyed = false;
	private suppressEvents = false;
	private defaultVolume = 1;

	public constructor(voiceConnection: VoiceConnection, textChannel: GuildTextBasedChannel) {
		super();
		this.voiceConnection = voiceConnection;
		this.audioPlayer = createAudioPlayer();
		this.textChannel = textChannel;
		this.queue = [];

		this.voiceConnection.on('stateChange', async (_oldState, newState) => {
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (
					newState.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
					newState.closeCode === 4014
				) {
					try {
						await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
					} catch {
						this.destroy();
					}
				} else if (this.voiceConnection.rejoinAttempts < 5) {
					await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
					this.voiceConnection.rejoin();
				} else {
					this.destroy();
				}
			} else if (newState.status === VoiceConnectionStatus.Destroyed) {
				this.destroy();
			} else if (
				!this.readyLock &&
				(newState.status === VoiceConnectionStatus.Connecting ||
					newState.status === VoiceConnectionStatus.Signalling)
			) {
				this.readyLock = true;
				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
				} catch {
					if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
						this.voiceConnection.destroy();
					}
				} finally {
					this.readyLock = false;
				}
			}
		});

		this.audioPlayer.on('stateChange', (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				const resource = oldState.resource as AudioResource<Track> | undefined;
				const track = resource?.metadata;
				if (track && !this.suppressEvents) {
					this.emit('finish', track);
				}
				this.suppressEvents = false;
				this.cleanupResource(resource);
				void this.processQueue();
			} else if (newState.status === AudioPlayerStatus.Playing) {
				const resource = newState.resource as AudioResource<Track> | undefined;
				const track = resource?.metadata;
				if (track) {
					this.emit('start', track, resource);
				}
			}
		});

		this.audioPlayer.on('error', (error: AudioPlayerError) => {
			const resource = error.resource as AudioResource<Track> | undefined;
			const track = resource?.metadata;
			this.cleanupResource(resource);
			this.emit('error', track, error);
			void this.processQueue();
		});

		voiceConnection.subscribe(this.audioPlayer);
	}

	public enqueue(track: Track): void {
		this.queue.push(track);
		void this.processQueue();
	}

	public get currentResource(): AudioResource<Track> | undefined {
		return this.audioPlayer.state.status !== AudioPlayerStatus.Idle
			? (this.audioPlayer.state.resource as AudioResource<Track>)
			: undefined;
	}

	public get currentTrack(): Track | undefined {
		return this.currentResource?.metadata;
	}

	public get isPlaying(): boolean {
		return this.audioPlayer.state.status === AudioPlayerStatus.Playing;
	}

	public get isPaused(): boolean {
		return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
	}

	public get volume(): number {
		return this.currentResource?.volume?.volume ?? this.defaultVolume;
	}

	public setVolume(value: number): void {
		this.defaultVolume = value;
		this.currentResource?.volume?.setVolume(value);
	}

	public pause(): boolean {
		if (this.isPlaying) {
			this.audioPlayer.pause();
			return true;
		}
		return false;
	}

	public unpause(): boolean {
		if (this.isPaused) {
			this.audioPlayer.unpause();
			return true;
		}
		return false;
	}

	public stop(): void {
		this.queueLock = true;
		this.queue = [];
		this.stopPlayback(true);
		this.queueLock = false;
	}

	public skip(): void {
		this.stopPlayback(true);
	}

	public destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		this.queueLock = true;
		this.queue = [];
		this.stopPlayback(true);
		if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
			this.voiceConnection.destroy();
		}
		this.emit('disconnect');
		this.removeAllListeners();
	}

	private stopPlayback(suppressEvents: boolean): void {
		this.suppressEvents = suppressEvents;
		const currentResource =
			this.audioPlayer.state.status !== AudioPlayerStatus.Idle
				? (this.audioPlayer.state.resource as AudioResource<Track> | undefined)
				: undefined;
		this.audioPlayer.stop(true);
		this.cleanupResource(currentResource);
	}

	private cleanupResource(resource: AudioResource<Track> | undefined): void {
		if (!resource) return;
		try {
			if (resource.playStream && !resource.playStream.destroyed) {
				resource.playStream.destroy();
			}
		} catch {
			// ignore
		}
	}

	private async processQueue(): Promise<void> {
		if (
			this.queueLock ||
			this.audioPlayer.state.status !== AudioPlayerStatus.Idle ||
			this.queue.length === 0
		) {
			return;
		}

		if (this.destroyed) return;

		this.queueLock = true;
		const nextTrack = this.queue.shift()!;

		try {
			const resource = nextTrack.createAudioResource();
			this.audioPlayer.play(resource);
			if (this.defaultVolume !== 1) {
				resource.volume?.setVolume(this.defaultVolume);
			}
		} catch (error) {
			this.emit('error', nextTrack, error as Error);
			return this.processQueue();
		} finally {
			this.queueLock = false;
		}
	}
}

export function createGuildAudioPlayer(channel: VoiceBasedChannel, textChannel: GuildTextBasedChannel): GuildAudioPlayer {
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: createDiscordJSAdapter(channel),
	});
	return new GuildAudioPlayer(connection, textChannel);
}
