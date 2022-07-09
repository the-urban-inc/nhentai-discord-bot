type F = (...args: any) => string;

const Messages = {
    FAILED_TO_PLAY_TRACK: '💀\u2000Failed to play track, please try again later!',
    FAILED_TO_JOIN_VC: '💀\u2000Failed to join voice channel, please try again later!',
    OWNER_ONLY: '🚫\u2000This command is owner-only',
    NSFW_COMMAND_IN_SFW_CHANNEL: (command: string) =>
        `🔞\u2000NSFW command (${command}) can't be used in SFW channel`,
    NSFW_VOICE_CHANNEL: '🔞\u2000The ASMR feature is NSFW and therefore the voice channel must also be NSFW',
    MISSING_PERMISSIONS: (missing: string[]) =>
        `❌\u2000User is missing permissions: ${missing.map(x => `\`${x}\``).join(', ')}`,
    COOLDOWN: (timeLeft: number) => `⌛\u2000User on cooldown. ${timeLeft} second(s) left.`,
    NO_IMAGE: '❔\u2000No image or image URL found within the message',
    NO_RESULT: (result?: string) =>
        result ? `❌\u2000No result found with keyword: \`${result}\`` : '❌\u2000No result found',
    INVALID_PAGE_INDEX: (page: number, max: number) =>
        `❌\u2000Invalid page index: \`${page}\`. Page number must be between 1 and ${max}.`,
    UNKNOWN_TAG: (tag: string) => `💀\u2000Tag \`${tag}\` isn't supported yet`,
    INVALID_IMAGE: (image: string) => `❌\u2000Invalid image URL: ${image}`,
    TIMED_OUT: '💀\u2000Request timed out, try again later',
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
