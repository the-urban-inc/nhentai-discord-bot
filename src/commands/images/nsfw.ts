import { Command, SubAlias } from '@structures';
import { Message } from 'discord.js';
import config from '@config';
import { NSFW_METHODS } from '@api/images';
const PREFIX = config.settings.prefix.nsfw[0];

const IMAGES = {
    ahegao: {
        description: 'Shows a random NSFW ahegao picture.\nImages from HMtai API.',
        examples: [
            '\n⠄⠄⠄⢰⣧⣼⣯⠄⣸⣠⣶⣶⣦⣾⠄⠄⠄⠄⡀⠄⢀⣿⣿⠄⠄⠄⢸⡇⠄⠄\n⠄⠄⠄⣾⣿⠿⠿⠶⠿⢿⣿⣿⣿⣿⣦⣤⣄⢀⡅⢠⣾⣛⡉⠄⠄⠄⠸⢀⣿⠄\n⠄⠄⢀⡋⣡⣴⣶⣶⡀⠄⠄⠙⢿⣿⣿⣿⣿⣿⣴⣿⣿⣿⢃⣤⣄⣀⣥⣿⣿⠄\n⠄⠄⢸⣇⠻⣿⣿⣿⣧⣀⢀⣠⡌⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠿⠿⣿⣿⣿⠄\n⠄⢀⢸⣿⣷⣤⣤⣤⣬⣙⣛⢿⣿⣿⣿⣿⣿⣿⡿⣿⣿⡍⠄⠄⢀⣤⣄⠉⠋⣰\n⠄⣼⣖⣿⣿⣿⣿⣿⣿⣿⣿⣿⢿⣿⣿⣿⣿⣿⢇⣿⣿⡷⠶⠶⢿⣿⣿⠇⢀⣤\n⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣽⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣷⣶⣥⣴⣿⡗\n⢀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠄\n⢸⣿⣦⣌⣛⣻⣿⣿⣧⠙⠛⠛⡭⠅⠒⠦⠭⣭⡻⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠄\n⠘⣿⣿⣿⣿⣿⣿⣿⣿⡆⠄⠄⠄⠄⠄⠄⠄⠄⠹⠈⢋⣽⣿⣿⣿⣿⣵⣾⠃⠄\n⠄⠘⣿⣿⣿⣿⣿⣿⣿⣿⠄⣴⣿⣶⣄⠄⣴⣶⠄⢀⣾⣿⣿⣿⣿⣿⣿⠃⠄⠄\n⠄⠄⠈⠻⣿⣿⣿⣿⣿⣿⡄⢻⣿⣿⣿⠄⣿⣿⡀⣾⣿⣿⣿⣿⣛⠛⠁⠄⠄⠄\n⠄⠄⠄⠄⠈⠛⢿⣿⣿⣿⠁⠞⢿⣿⣿⡄⢿⣿⡇⣸⣿⣿⠿⠛⠁⠄⠄⠄⠄⠄\n⠄⠄⠄⠄⠄⠄⠄⠉⠻⣿⣿⣾⣦⡙⠻⣷⣾⣿⠃⠿⠋⠁⠄⠄⠄⠄⠄⢀⣠⣴\n⣿⣿⣿⣶⣶⣮⣥⣒⠲⢮⣝⡿⣿⣿⡆⣿⡿⠃⠄⠄⠄⠄⠄⠄⠄⣠⣴⣿⣿⣿',
        ],
        additionalInfo:
            'The anime/manga version of an orgasmic facial expression. It\'s generally very sexualized and lewd, and may or may not be accompanied with heart eyes/pupils.\n\nAhegao is commonly used in any kind of BDSM type hentai, along with hentai that feature the "rape" fetish. However, ahegao does NOT equal rape.',
    },
    anal: {
        description: 'Shows a random NSFW anal picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nCharlie in the chocolate factory.'],
    },
    ass: {
        description: 'Shows a random NSFW ass picture.\nImages from nekobot.xyz or HMtai API.',
        examples: ['\n(_|_)'],
        additionalInfo:
            '(_!_) = Normal Ass\n(__!__) = Big Ass\n(!) = Tight Ass\n(_?_) = Dumb Ass\n(_E=MC2_) = Smart Ass\n(_$_) = Rich Ass\n(_x_) = Kiss My Ass\n(_X_) = Get Off My Ass',
    },
    avatar: {
        description: 'Shows a random NSFW, avatar material picture.\nImages from nekos.life.',
        examples: ["\nDiscord probably won't allow you to use this as your pfp tho."],
    },
    bdsm: {
        description: 'Shows a random NSFW bdsm picture.\nImages from HMtai API.',
        examples: ['\n⛓️⛓️⛓️'],
        additionalInfo:
            'An overlapping abbrevation of Bondage and Discipline (BD), Dominance and Submission (DS), Sadism and Masochism (SM).',
    },
    blowjob: {
        description: 'Shows a random NSFW blowjob picture.\nImages from nekos.life or HMtai API.',
        examples: ['\nS U C C.'],
        additionalInfo: '[Blowjob Guide](https://www.urbandictionary.com/define.php?term=blowjob)',
    },
    boobs: {
        description: 'Shows a random NSFW boobs picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\n[I wanna touch some boobs ...](https://i.imgur.com/SNhjg3T.png)'],
    },
    creampie: {
        aliases: ['nsfw_nakadashi'],
        description: 'Shows a random NSFW creampie picture.\nImages from HMtai API.',
        examples: ['\nSo hot and sticky mmm'],
        additionalInfo:
            'Also known as nakadashi (cumming inside). A verb that describes the act of condomless (unprotected) sex and ejaculating inside of a vagina or anus. The act of not pulling the penis out of the vagina or anus and ejaculating inside.',
    },
    cuckold: {
        aliases: ['nsfw_ntr', 'nsfw_netorare'],
        description: 'Shows a random NSFW cuckold picture.\nImages from HMtai API.',
        examples: ['\nEww you like this stuff??? 🤨'],
        additionalInfo:
            'A man who willingly encourages his wife to sleep with other people because it brings him pleasure. Cuckolds exist on a spectrum between two extremes. One on end is the masochistic cuckold who enjoys humiliations, degradation, and other demeaning activities at the hands of his wife and her lover. The alpha cuckold lies at the opposite end of the spectrum and does not enjoy any form of humiliation and often has a direct say in who his wife sleeps with and when.',
    },
    cum: {
        description: 'Shows a random NSFW cum picture.\nImages from nekos.life or HMtai API.',
        examples: ['\nShows the white stuff that comes out of your pee pee.'],
    },
    elf: {
        description: 'Shows a random NSFW elf picture.\nImages from HMtai API.',
        examples: ['\nPointy ears.'],
    },
    ero: {
        description: 'Shows a random NSFW ero picture.\nImages from nekos.life or HMtai API.',
        examples: ['\nNot quite hentai.'],
    },
    feet: {
        aliases: ['nsfw_foot'],
        description: 'Shows a random NSFW feet picture.\nImages from nekos.life or HMtai.',
        examples: ["\nAh, I See You're a Man of Culture As Well."],
    },
    femdom: {
        description: 'Shows a random NSFW femdom picture.\nImages from nekos.life or HMtai API.',
        examples: ['\nYou masochist.'],
        additionalInfo: 'Stands for Female Domination.',
    },
    futa: {
        aliases: ['nsfw_futanari'],
        description: 'Shows a random NSFW futanari picture.\nImages from nekos.life.',
        examples: ['\nCan literally fuck herself'],
        additionalInfo:
            'Google studies found out, that 60-70% of all people who search for `futanari` are straight.',
    },
    glasses: {
        description: 'Shows a random NSFW glasses picture.\nImages from HMtai API.',
        examples: ['\nSomething girls look hot wearing.'],
    },
    hentai: {
        description:
            'Shows a random NSFW hentai picture.\nImages from nekos.life or nekobot.xyz or HMtai API.',
        examples: ['\nFamily friendly content. Go search it!'],
    },
    holo: {
        description: 'Shows a random NSFW holo picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nNot hololive'],
        additionalInfo:
            'Holo: A female demi-human wolf and the protagonist of the light novel, manga and anime series Spice & Wolf.',
    },
    incest: {
        description: 'Shows a random NSFW incest picture.\nImages from HMtai API.',
        examples: ['\nSweet Home Alabama.'],
    },
    kemonomimi: {
        description:
            'Shows a random NSFW kemonomimi picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nElon Musk Prayge.'],
        additionalInfo:
            'Kemonomimi: A person with animal characteristics, such as cat ears, cat tails, whiskers, paws.',
    },
    keta: {
        description: 'Shows a random NSFW keta picture.\nImages from nekos.life.',
        examples: ['\nidk what this means. srsly. nice pics tho.'],
    },
    kitsune: {
        aliases: ['nsfw_foxgirl'],
        description: 'Shows a random NSFW kitsune picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\n[fox](https://en.wikipedia.org/wiki/Kitsune).'],
    },
    kuni: {
        description: 'Shows a random NSFW kuni picture.\nImages from nekos.life.',
        examples: ['\ni think this means female foreplay.'],
    },
    masturbation: {
        aliases: ['nsfw_solo'],
        description: 'Shows a random NSFW feet picture.\nImages from nekos.life or HMtai API.',
        examples: ['\nPlaying with your nether regions.'],
    },
    midriff: {
        description: 'Shows a random NSFW midriff picture.\nImages from nekobot.xyz.',
        examples: [
            "\nThe sexiest part of a woman's body, between the mons pubis and the breasts, including the naval.",
        ],
    },
    neko: {
        description:
            'Shows a random NSFW neko picture.\nImages from nekos.life or nekobot.xyz or HMTai API.',
        examples: ['\nCatgirls.'],
    },
    orgy: {
        description: 'Shows a random NSFW feet picture.\nImages from HMtai API.',
        examples: ['\nA gathering of four or more people who take their socks off.'],
    },
    paizuri: {
        aliases: ['nsfw_boobjob'],
        description: 'Shows a random NSFW paizuri picture.\nImages from nekobot.xyz or HMtai API.',
        examples: ["\nEvery men's dream."],
        additionalInfo:
            'Paizuri: A subcategory of hentai that involves `breast sex`, also known in America and other parts of the world (slang) as `titty fucking`, `tit fucking`, etc.\nWhen paizuri first became a big thing in hentai, it was most commonplace for the character giving paizuri to the second party to have large or huge breasts. However, in the past few years or so, this has become more varied. In many types of hentai, women of all breast sizes can give paizuri.\nSome varieties: double paizuri (involving two women performing it on a single penis), multi paizuri (same as double but involving more women), clothed paizuri, futa (she-male) paizuri, etc...',
    },
    pantsu: {
        aliases: ['nsfw_panties'],
        description: 'Shows a random NSFW pantsu picture.\nImages from HMtai API.',
        examples: ['\nCan I see your panties?'],
        additionalInfo:
            'The japanese word for "panties" (panties in a japanese accent) that since Chii from the series Chobits (CLAMP) has said, has spiraled into another form of slang for wannabe-asian otakus.',
    },
    public: {
        aliases: ['nsfw_exhibitionism'],
        description: 'Shows a random NSFW hentai-in-public picture.\nImages from HMtai API.',
        examples: [
            "\nA place where you're not allowed to do certain things, but nobody tells you until after you do it.",
        ],
    },
    pussy: {
        aliases: ['nsfw_vagina'],
        description: 'Shows a random NSFW pussy picture.\nImages from nekos.life or HMtai API.',
        examples: [
            '\nSomething men babies spend 9 months getting out of - and the rest of their lives trying to get back into ...',
        ],
    },
    tentacle: {
        aliases: ['nsfw_tentacles'],
        description: 'Shows a random NSFW tentacle picture.\nImages from nekobot.xyz or HMtai API.',
        examples: ["\nA Japanese schoolgirl's best friend."],
    },
    thigh: {
        aliases: ['nsfw_thighs'],
        description: 'Shows a random NSFW tentacle picture.\nImages from nekobot.xyz or HMtai API.',
        examples: [
            '\nmmmmmm yes mmm mmm mmm very good mmmmmmmmmmmmmmmmmmm yumm mmmmmmmmmmmm gimmie please mmmm thighs',
        ],
    },
    trap: {
        description: 'Shows a random NSFW trap picture.\nImages from nekos.life.',
        examples: ["\nIT'S A TRAP"],
        additionalInfo:
            "Trap: Usually found within an anime/manga/ero doujin, this is when a male (usually a young teen) who is small and skinny dresses in women's clothes, creating a dangerously effective illusion in which they present themselves as female. This terrifyingly deception technique is the reason that they were given the name `traps`.\nMany brave straight warriors have fallen to the traps, being brainwashed into believing that it's not gay if they look like a girl. Just remember, if you are to one day find yourself about to go down on a trap, think to yourself: \"n*gga that's gay asf\"",
    },
    uniform: {
        description: 'Shows a random NSFW uniform picture.\nImages from HMtai API.',
        examples: ["\nBack to the good ol' days."],
    },
    wallpaper: {
        description: 'Shows a random NSFW mobile wallpaper.\nImages from HMtai API.',
        examples: ["\nDon't open in public."],
    },
    yaoi: {
        description: 'Shows a random NSFW feet picture.\nImages from nekobot.xyz.',
        examples: ['\ngei'],
        additionalInfo:
            "Yaoi: In the Japanese industry, Boy's Love, homosexuality, gay love.\n\nWhat every otaku will inevitably stumble upon and pass by.\nWhat every female otaku will inevitably stumble upon and remain.\nPopular in fanfictions usually including the girl's favorite pairing, two characters that are coupled together.\nConsists of doujinshi and fanfictions, also drama CDs.\nMale equivalent of yuri, lesbian relationship.",
    },
    yuri: {
        description: 'Shows a random NSFW yuri picture.\nImages from nekos.life or HMtai API.',
        examples: ['\ngei'],
        additionalInfo:
            'Yuri: A genre of sexually explicit anime/manga literally meaning girls love. It is a Japanese jargon term for content and a genre involving love between women in manga, anime, and related Japanese media. Yuri can focus either on the sexual or the emotional aspects of the relationship, the latter sometimes being called shōjo-ai by western fans.\nThe themes yuri deals with have their roots in the Japanese lesbian literature of early twentieth century, with pieces such as Yaneura no Nishojo by Nobuko Yoshiya. Nevertheless, it was not until the 1970s that lesbian-themed works began to appear in manga, by the hand of artists such as Ryoko Yamagishi and Riyoko Ikeda. The 1990s brought new trends in manga and anime, as well as in dōjinshi productions, along with more acceptance for this kind of content. In 2003 the first manga magazine specifically dedicated to yuri was launched under the name Yuri Shimai, followed by its revival Comic Yuri Hime, launched after the former was discontinued in 2004.',
    },
    zettaiRyouiki: {
        aliases: ['nsfw_zr'],
        description: 'Shows a random NSFW zettai ryouiki picture.\nImages from HMtai API.',
        examples: [
            '\nThat one part of the flesh being squeeze in thigh-highs. [More on Wikipedia](https://en.wikipedia.org/wiki/Zettai_ry%C5%8Diki)',
        ],
    },
};

export default class extends Command {
    constructor() {
        super('nsfw-image', {
            aliases: Object.keys(NSFW_METHODS),
            subAliases: IMAGES,
            nsfw: true,
            cooldown: 10000,
            error: {
                'No Result': {
                    message: 'Failed to fetch image!',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
                'Parsing Failed': {
                    message: 'An error occurred while parsing command.',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
            },
        });
    }

    async exec(message: Message) {
        try {
            let method = message.util?.parsed?.alias;
            if (!(method in NSFW_METHODS)) {
                const idx = Object.keys(IMAGES).findIndex(key => {
                    return IMAGES[key].aliases?.includes(method);
                });
                if (idx === -1) {
                    return this.client.commandHandler.emitError(
                        new Error('Parsing Failed'),
                        message,
                        this
                    );
                }
                method = `nsfw_${Object.keys(IMAGES)[idx]}`;
            }
            const image = await this.client.images.fetch(method as keyof typeof NSFW_METHODS);
            if (image === 'Unknown Image Type') {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            if (!image || !this.client.util.isUrl(image)) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const embed = this.client.embeds
                .default()
                .setDescription(`[Click here if image failed to load](${image})`)
                .setImage(image);
            return this.client.embeds.richDisplay({ image }).addPage(embed).useCustomFooters().run(
                this.client,
                message,
                message, // await message.channel.send('Searching ...'),
                '',
                {
                    collectorTimeout: 180000,
                }
            );
        } catch (err) {
            this.client.logger.error(err);
        }
    }
}
