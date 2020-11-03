import config from '@inari/config'

export const PERMISSIONS = [
    'MANAGE_MESSAGES',
    'SEND_MESSAGES',
    'EMBED_LINKS',
    'ATTACH_FILES',
    'ADD_REACTIONS',
    'READ_MESSAGE_HISTORY',
    'USE_EXTERNAL_EMOJIS',
] as const;

export const ICON = 'https://i.imgur.com/7WX63G3.png';

export const FLAG_EMOJIS = {
    chinese: ':flag_cn:',
    english: ':flag_gb:',
    japanese: ':flag_jp:',
};

export const SORT_METHODS = ['recent', 'popular-today', 'popular-week', 'popular'];

export const BANNED_TAGS = ['19440', '32341', '27217', '15425', '1088', '4549', '10542', '14069']; // lolicon, shotacon, guro, vore, bdsm, torture, snuff, ryona

export const BLOCKED_MESSAGE = `This call contains contents violating [Discord's Community Guidelines](https://discord.com/guidelines), therefore, for your own safety, I have decided to omit the images.\nIf you wish to continue viewing the images, contact someone in your server with the Manage Guild permission to unlock them using \`${config.settings.prefix.nsfw[0]}danger\`.`;

export const TAGS = [
    'g',
    'tag',
    'artist',
    'character',
    'parody',
    'group',
    'language',
    'category',
] as const;
