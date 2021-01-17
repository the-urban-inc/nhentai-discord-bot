import { Command } from '@structures';
import { Message } from 'discord.js';
import axios from 'axios';

const IMAGES = {
    anal: {
        description: 'Shows a random NSFW anal picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nCharlie in the chocolate factory.'],
    },
    ass: {
        description: 'Shows a random NSFW ass picture.\nImages from nekobot.xyz.',
        examples: ['\n(_|_)'],
        additionalInfo:
            '(_!_) = Normal Ass\n(__!__) = Big Ass\n(!) = Tight Ass\n(_?_) = Dumb Ass\n(_E=MC2_) = Smart Ass\n(_$_) = Rich Ass\n(_x_) = Kiss My Ass\n(_X_) = Get Off My Ass',
    },
    avatar: {
        description: 'Shows a random NSFW, avatar material picture.\nImages from nekos.life.',
        examples: ["\nDiscord probably won't allow you to use this as your pfp tho."],
    },
    blowjob: {
        description: 'Shows a random NSFW blowjob picture.\nImages from nekos.life.',
        examples: ['\nS U C C.'],
        additionalInfo:
            '[Blowjob Guide](https://www.urbandictionary.com/define.php?term=blowjob)',
    },
    boobs: {
        description: 'Shows a random NSFW boobs picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\n[I wanna touch some boobs ...](https://i.imgur.com/SNhjg3T.png)'],
    },
    cum: {
        description: 'Shows a random NSFW cum picture.\nImages from nekos.life.',
        examples: ['\nshows the white stuff that comes out of your pee pee.'],
    },
    ero: {
        description: 'Shows a random NSFW ero picture.\nImages from nekos.life.',
        examples: ['\nNot quite hentai.'],
    },
    feet: {
        description: 'Shows a random NSFW feet picture.\nImages from nekos.life.',
        examples: ["\nAh, I See You're a Man of Culture As Well."],
    },
    femdom: {
        description: 'Shows a random NSFW femdom picture.\nImages from nekos.life.',
        examples: ['\nYou masochist.'],
        additionalInfo: 'Stands for Female Domination.',
    },
    futa: {
        description: 'Shows a random NSFW futanari picture.\nImages from nekos.life.',
        examples: ['\nCan literally fuck herself'],
        additionalInfo:
            'Google studies found out, that 60-70% of all people who search for `futanari` are straight.',
    },
    hentai: {
        description: 'Shows a random NSFW hentai picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nFamily friendly content. Go search it!'],
    },
    holo: {
        description: 'Shows a random NSFW holo picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nNot hololive'],
        additionalInfo:
            'Holo: A female demi-human wolf and the protagonist of the light novel, manga and anime series Spice & Wolf.',
    },
    kemonomimi: {
        description:
            'Shows a random NSFW kemonomimi picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nElon Musk Prayge'],
        additionalInfo:
            'Kemonomimi: A person with animal characteristics, such as cat ears, cat tails, whiskers, paws.',
    },
    keta: {
        description: 'Shows a random NSFW keta picture.\nImages from nekos.life.',
        examples: ['\nidk what this means. srsly. nice pics tho.'],
    },
    kitsune: {
        description: 'Shows a random NSFW kitsune picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\n[fox](https://en.wikipedia.org/wiki/Kitsune).'],
    },
    kuni: {
        description: 'Shows a random NSFW kuni picture.\nImages from nekos.life.',
        examples: ['\ni think this means female foreplay.'],
    },
    midriff: {
        description: 'Shows a random NSFW midriff picture.\nImages from nekobot.xyz.',
        examples: [
            "\nThe sexiest part of a woman's body, between the mons pubis and the breasts, including the naval.",
        ],
    },
    neko: {
        description: 'Shows a random NSFW neko picture.\nImages from nekos.life or nekobot.xyz.',
        examples: ['\nCatgirls.'],
    },
    paizuri: {
        description: 'Shows a random NSFW paizuri picture.\nImages from nekobot.xyz.',
        examples: ["\nEvery men's dream."],
        additionalInfo:
            'Paizuri: A subcategory of hentai that involves `breast sex`, also known in America and other parts of the world (slang) as `titty fucking`, `tit fucking`, etc.\nWhen paizuri first became a big thing in hentai, it was most commonplace for the character giving paizuri to the second party to have large or huge breasts. However, in the past few years or so, this has become more varied. In many types of hentai, women of all breast sizes can give paizuri.\nSome varieties: double paizuri (involving two women performing it on a single penis), multi paizuri (same as double but involving more women), clothed paizuri, futa (she-male) paizuri, etc...',
    },
    pussy: {
        description: 'Shows a random NSFW pussy picture.\nImages from nekos.life.',
        examples: [
            '\nSomething men babies spend 9 months getting out of - and the rest of their lives trying to get back into ...',
        ],
    },
    solo: {
        description: 'Shows a random NSFW solo girl picture.\nImages from nekos.life.',
        examples: ['\n0% gay (unless ur a girl).'],
    },
    tentacle: {
        description: 'Shows a random NSFW tentacle picture.\nImages from nekobot.xyz.',
        examples: ["\nA Japanese schoolgirl's best friend."],
    },
    thigh: {
        description: 'Shows a random NSFW tentacle picture.\nImages from nekobot.xyz.',
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
    yuri: {
        description: 'Shows a random NSFW yuri picture.\nImages from nekos.life.',
        examples: ['\ngei'],
        additionalInfo:
            'Yuri: A genre of sexually explicit anime/manga literally meaning girls love. It is a Japanese jargon term for content and a genre involving love between women in manga, anime, and related Japanese media. Yuri can focus either on the sexual or the emotional aspects of the relationship, the latter sometimes being called shōjo-ai by western fans.\nThe themes yuri deals with have their roots in the Japanese lesbian literature of early twentieth century, with pieces such as Yaneura no Nishojo by Nobuko Yoshiya. Nevertheless, it was not until the 1970s that lesbian-themed works began to appear in manga, by the hand of artists such as Ryoko Yamagishi and Riyoko Ikeda. The 1990s brought new trends in manga and anime, as well as in dōjinshi productions, along with more acceptance for this kind of content. In 2003 the first manga magazine specifically dedicated to yuri was launched under the name Yuri Shimai, followed by its revival Comic Yuri Hime, launched after the former was discontinued in 2004.',
    },
};

const NL_IMAGES = {
    anal: ['anal'],
    nsfw_avatar: ['avatar'],
    blowjob: ['bJ', 'blowJob'],
    boobs: ['boobs', 'tits'],
    cum: ['cumsluts', 'cumArts'],
    ero: ['ero'],
    feet: ['feet', 'feetGif', 'eroFeet'],
    femdom: ['femdom'],
    futa: ['futanari'],
    hentai: ['classic', 'randomHentaiGif'],
    nsfw_holo: ['holo', 'holoEro'],
    nsfw_kemonomimi: ['kemonomimi', 'eroKemonomimi'],
    keta: ['keta'],
    kitsune: ['kitsune'],
    kuni: ['kuni'],
    nsfw_neko: ['neko', 'eroNeko', 'nekoGif'],
    pussy: ['pussy', 'pussyWankGif', 'pussyArt', 'pussyGif'],
    solo: ['girlSolo', 'girlSoloGif'],
    trap: ['trap'],
    yuri: ['yuri', 'eroYuri', 'lesbian'],
};

const NB_IMAGES = {
    anal: ['hanal'],
    ass: ['hass'],
    boobs: ['hboobs'],
    hentai: ['hentai'],
    nsfw_holo: ['holo'],
    nsfw_kemonomimi: ['kemonomimi'],
    kitsune: ['hkitsune'],
    midriff: ['hmidriff'],
    nsfw_neko: ['hneko'],
    paizuri: ['paizuri'],
    tentacle: ['tentacle'],
    thigh: ['hthigh'],
};

export default class extends Command {
    constructor() {
        super('nsfw-image', {
            aliases: [...new Set(Object.keys(NL_IMAGES).concat(Object.keys(NB_IMAGES)))],
            subAliases: IMAGES,
            channel: 'guild',
            nsfw: true,
        });
    }

    async exec(message: Message) {
        try {
            const method = message.util?.parsed?.alias;
            if (!method) {
                throw new Error('Unknown Category');
            }
            let image = null;
            if (Object.keys(NL_IMAGES).includes(method)) {
                image = (
                    await this.client.nekoslife.nsfw[this.client.util.random(NL_IMAGES[method])]()
                ).url;
                if (Object.keys(NB_IMAGES).includes(method)) {
                    const nbimage = await axios
                        .get(
                            `https://nekobot.xyz/api/image?type=${this.client.util.random(
                                NB_IMAGES[method]
                            )}`
                        )
                        .then(res => res.data.message);
                    if (nbimage === 'Unknown Image Type')
                        return message.channel.send(this.client.embeds.internalError(nbimage));
                    image = this.client.util.random([image, nbimage]);
                }
            } else {
                image = await axios
                    .get(
                        `https://nekobot.xyz/api/image?type=${this.client.util.random(
                            NB_IMAGES[method]
                        )}`
                    )
                    .then(res => res.data.message);
                if (image === 'Unknown Image Type')
                    return message.channel.send(this.client.embeds.internalError(image));
            }
            if (!image) {
                throw new Error();
            }
            const embed = this.client.util
                .embed()
                .setDescription(`[Click here if image failed to load](${image})`)
                .setImage(image);
            return this.client.embeds
                .richDisplay({ image: true })
                .addPage(embed)
                .useCustomFooters()
                .run(this.client, message, await message.channel.send('Searching ...'), '', {
                    time: 180000,
                });
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
