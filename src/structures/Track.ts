import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice';

export interface TrackData {
	url: string;
	videoURL: string;
	imageURL: string;
	title: string;
	circle: string;
	duration: string;
	tags: string[];
	tracks: { title: string; length: number }[];
	requestedBy?: { id: string; username: string };
}

export class Track implements TrackData {
	public readonly url: string;
	public readonly videoURL: string;
	public readonly imageURL: string;
	public readonly title: string;
	public readonly circle: string;
	public readonly duration: string;
	public readonly tags: string[];
	public readonly tracks: { title: string; length: number }[];
	public readonly requestedBy?: { id: string; username: string };

	private constructor({ url, videoURL, imageURL, title, circle, duration, tags, tracks, requestedBy }: TrackData) {
		this.url = url;
		this.videoURL = videoURL;
		this.imageURL = imageURL;
		this.title = title;
		this.circle = circle;
		this.duration = duration;
		this.tags = tags;
		this.tracks = tracks;
		this.requestedBy = requestedBy;
	}

	public createAudioResource(): AudioResource<Track> {
		return createAudioResource(this.videoURL, {
			metadata: this,
			inputType: StreamType.Arbitrary,
			inlineVolume: true,
		});
	}

	public getChapterAt(playbackMs: number): { index: number; offset: number } {
		const playbackSec = playbackMs / 1000;
		let accumulated = 0;
		for (let i = 0; i < this.tracks.length; i++) {
			const trackEnd = accumulated + this.tracks[i].length;
			if (playbackSec < trackEnd) {
				return { index: i, offset: playbackSec - accumulated };
			}
			accumulated = trackEnd;
		}
		const last = this.tracks[this.tracks.length - 1];
		return { index: this.tracks.length - 1, offset: last?.length ?? 0 };
	}

	public static from(
		url: string,
		videoURL: string,
		imageURL: string,
		title: string,
		circle: string,
		duration: string,
		tags: string[],
		tracks: { title: string; length: number }[],
		requestedBy?: { id: string; username: string }
	): Track {
		return new Track({ url, videoURL, imageURL, title, circle, duration, tags, tracks, requestedBy });
	}
}
