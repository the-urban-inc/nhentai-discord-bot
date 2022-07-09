type F = (...args: any) => string;

const Messages = {
    FAILED_TO_PLAY_TRACK: 'Failed to play track, please try again later!',
    FAILED_TO_JOIN_VC: 'Failed to join voice channel, please try again later!',
    OWNER_ONLY: 'This command is owner-only',
    NSFW_COMMAND_IN_SFW_CHANNEL: (command: string) =>
        `NSFW command (${command}) can't be used in SFW channel`,
    NSFW_VOICE_CHANNEL: 'The ASMR feature is NSFW and therefore the voice channel must also be NSFW',
    MISSING_PERMISSIONS: (missing: string[]) =>
        `User is missing permissions: ${missing.map(x => `\`${x}\``).join(', ')}`,
    COOLDOWN: (timeLeft: number) => `User on cooldown. ${timeLeft} second(s) left.`,
    NO_IMAGE: 'No image or image URL found within the message',
    NO_RESULT: (result?: string) =>
        result ? `No result found with keyword: \`${result}\`` : 'No result found',
    INVALID_PAGE_INDEX: (page: number, max: number) =>
        `Invalid page index: \`${page}\`. Page number must be between 1 and ${max}.`,
    UNKNOWN_TAG: (tag: string) => `Tag \`${tag}\` isn't supported yet`,
    INVALID_IMAGE: (image: string) => `Invalid image URL: ${image}`,
    TIMED_OUT: 'Request timed out, try again later',
};

export class UserError extends Error {
    code: string;
    constructor(key: keyof typeof Messages, ...args: any) {
        if (Messages[key] == null) throw new TypeError(`Error key '${key}' does not exist`);
        const message =
            typeof Messages[key] === 'function' ? (Messages[key] as F)(args) : Messages[key];
        super(message as string);
        this.code = key;
    }

    get name() {
        return `UserError [${this.code}]`;
    }
}
