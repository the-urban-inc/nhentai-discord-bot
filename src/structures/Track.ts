import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice';
import axios from 'axios';
import prism from 'prism-media';

export interface TrackData {
    url: string;
    videoURL: string;
    imageURL: string;
    title: string;
    circle: string;
    onStart: () => void;
    onFinish: () => void;
    onError: (error: Error) => void;
}

const noop = () => {};

export class Track implements TrackData {
    public readonly url: string;
    public readonly videoURL: string;
    public readonly imageURL: string;
    public readonly title: string;
    public readonly circle: string;
    public readonly onStart: () => void;
    public readonly onFinish: () => void;
    public readonly onError: (error: Error) => void;

    private constructor({
        url,
        videoURL,
        imageURL,
        title,
        circle,
        onStart,
        onFinish,
        onError,
    }: TrackData) {
        this.url = url;
        this.videoURL = videoURL;
        this.imageURL = imageURL;
        this.title = title;
        this.circle = circle;
        this.onStart = onStart;
        this.onFinish = onFinish;
        this.onError = onError;
    }

    public async createAudioResource(): Promise<AudioResource<Track>> {
        const response = await axios.get(this.videoURL, {
            responseType: 'stream',
        });
        const transcoder = new prism.FFmpeg({
            args: [
                '-analyzeduration',
                '0',
                '-loglevel',
                '0',
                '-acodec',
                'libopus',
                '-f',
                'opus',
                '-ar',
                '48000',
                '-ac',
                '2',
            ],
        });
        const opus = response.data.pipe(transcoder);
        return createAudioResource(opus, {
            metadata: this,
            inputType: StreamType.OggOpus,
        });
    }

    public static async from(
        url: string,
        videoURL: string,
        imageURL: string,
        title: string,
        circle: string,
        methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>
    ): Promise<Track> {
        const wrappedMethods = {
            onStart() {
                wrappedMethods.onStart = noop;
                methods.onStart();
            },
            onFinish() {
                wrappedMethods.onFinish = noop;
                methods.onFinish();
            },
            onError(error: Error) {
                wrappedMethods.onError = noop;
                methods.onError(error);
            },
        };
        return new Track({
            url,
            videoURL,
            imageURL,
            title,
            circle,
            ...wrappedMethods,
        });
    }
}
