import { Snowflake, Client, Guild, VoiceBasedChannel } from 'discord.js';
import {
    AudioPlayer,
    AudioPlayerError,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    DiscordGatewayAdapterCreator,
    DiscordGatewayAdapterLibraryMethods,
    entersState,
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

function trackClient(client: Client) {
    if (trackedClients.has(client)) return;
    trackedClients.add(client);
    client.ws.on(
        GatewayDispatchEvents.VoiceServerUpdate,
        (payload: GatewayVoiceServerUpdateDispatchData) => {
            adapters.get(payload.guild_id)?.onVoiceServerUpdate(payload);
        }
    );
    client.ws.on(
        GatewayDispatchEvents.VoiceStateUpdate,
        (payload: GatewayVoiceStateUpdateDispatchData) => {
            if (payload.guild_id && payload.session_id && payload.user_id === client.user?.id) {
                // @ts-ignore
                adapters.get(payload.guild_id)?.onVoiceStateUpdate(payload);
            }
        }
    );
    client.on('shardDisconnect', (_, shardId) => {
        const guilds = trackedShards.get(shardId);
        if (guilds) {
            for (const guildID of guilds.values()) {
                adapters.get(guildID)?.destroy();
            }
        }
        trackedShards.delete(shardId);
    });
}

const trackedShards = new Map<number, Set<Snowflake>>();

function trackGuild(guild: Guild) {
    let guilds = trackedShards.get(guild.shardId);
    if (!guilds) {
        guilds = new Set();
        trackedShards.set(guild.shardId, guilds);
    }
    guilds.add(guild.id);
}

export function createDiscordJSAdapter(channel: VoiceBasedChannel): DiscordGatewayAdapterCreator {
    return methods => {
        adapters.set(channel.guild.id, methods);
        trackClient(channel.client);
        trackGuild(channel.guild);
        return {
            sendPayload(data) {
                if (channel.guild.shard.status === 0) {
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

export class MusicSubscription {
    public readonly voiceConnection: VoiceConnection;
    public readonly audioPlayer: AudioPlayer;
    public queue: Track[];
    public queueLock = false;
    public readyLock = false;

    public constructor(voiceConnection: VoiceConnection) {
        this.voiceConnection = voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.queue = [];

        this.voiceConnection.on(
            'stateChange',
            async (_: any, newState: { status: any; reason: any; closeCode: number }) => {
                if (newState.status === VoiceConnectionStatus.Disconnected) {
                    if (
                        newState.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
                        newState.closeCode === 4014
                    ) {
                        try {
                            await entersState(
                                this.voiceConnection,
                                VoiceConnectionStatus.Connecting,
                                5_000
                            );
                        } catch {
                            this.voiceConnection.destroy();
                        }
                    } else if (this.voiceConnection.rejoinAttempts < 5) {
                        await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
                        this.voiceConnection.rejoin();
                    } else {
                        this.voiceConnection.destroy();
                    }
                } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                    this.stop();
                } else if (
                    !this.readyLock &&
                    (newState.status === VoiceConnectionStatus.Connecting ||
                        newState.status === VoiceConnectionStatus.Signalling)
                ) {
                    this.readyLock = true;
                    try {
                        await entersState(
                            this.voiceConnection,
                            VoiceConnectionStatus.Ready,
                            20_000
                        );
                    } catch {
                        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed)
                            this.voiceConnection.destroy();
                    } finally {
                        this.readyLock = false;
                    }
                }
            }
        );

        this.audioPlayer.on(
            'stateChange',
            (
                oldState: { status: any; resource: any },
                newState: { status: any; resource: any }
            ) => {
                if (
                    newState.status === AudioPlayerStatus.Idle &&
                    oldState.status !== AudioPlayerStatus.Idle
                ) {
                    (oldState.resource as AudioResource<Track>).metadata.onFinish();
                    void this.processQueue();
                } else if (newState.status === AudioPlayerStatus.Playing) {
                    (newState.resource as AudioResource<Track>).metadata.onStart();
                }
            }
        );

        this.audioPlayer.on('error', (error: AudioPlayerError) =>
            (error.resource as AudioResource<Track>).metadata.onError(error)
        );

        voiceConnection.subscribe(this.audioPlayer);
    }

    public enqueue(track: Track) {
        this.queue.push(track);
        void this.processQueue();
    }

    public stop() {
        this.queueLock = true;
        this.queue = [];
        this.audioPlayer.stop(true);
    }

    private async processQueue(): Promise<void> {
        if (
            this.queueLock ||
            this.audioPlayer.state.status !== AudioPlayerStatus.Idle ||
            this.queue.length === 0
        ) {
            return;
        }
        this.queueLock = true;

        const nextTrack = this.queue.shift()!;
        try {
            const resource = await nextTrack.createAudioResource();
            this.audioPlayer.play(resource);
            this.queueLock = false;
        } catch (error) {
            nextTrack.onError(error as Error);
            this.queueLock = false;
            return this.processQueue();
        }
    }
}
