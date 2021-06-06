import config from '@config';

export const PERMISSIONS = <const>[
    'CONNECT',
    'SPEAK',
    'USE_VAD',
    'MANAGE_MESSAGES',
    'SEND_MESSAGES',
    'EMBED_LINKS',
    'ATTACH_FILES',
    'ADD_REACTIONS',
    'READ_MESSAGE_HISTORY',
    'USE_EXTERNAL_EMOJIS',
];

export const ICON = 'https://i.imgur.com/cGT4RMd.png';

export const FLAG_EMOJIS = {
    chinese: ':flag_cn:',
    english: ':flag_gb:',
    japanese: ':flag_jp:',
};

export const SORT_METHODS = ['recent', 'popular-today', 'popular-week', 'popular'];

export const BANNED_TAGS = ['19440', '32341', '27217', '15425', '1088', '4549', '10542', '14069']; // lolicon, shotacon, guro, vore, bdsm, torture, snuff, ryona

export const BANNED_TAGS_TEXT = [
    'loli',
    'lolicon',
    'shota',
    'shotacon',
    'guro',
    'gore',
    'vore',
    'bdsm',
    'torture',
    'snuff',
    'ryona',
]; // this should be enough

export const BLOCKED_MESSAGE = `This command call contains contents violating [Discord's Community Guidelines](https://discord.com/guidelines), therefore, for your own safety, I have decided to omit the violating images.\nIf you wish to continue viewing the images, contact someone in your server with the Manage Server permission to unlock them using \`${config.settings.prefix.nsfw[0]}danger\`.`;

export const TAGS = <const>[
    'g',
    'tag',
    'artist',
    'character',
    'parody',
    'group',
    'language',
    'category',
];
