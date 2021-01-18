import { Command } from '@structures';
import { Message } from 'discord.js';
import axios from 'axios';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];

const IMAGES = {
    avatar: {
        description: 'Shows a random SFW, avatar material picture. Images from nekos.life.',
        examples: ["\nWant to pick a new anime pfp? I'm here to help."],
    },
    baka: {
        description:
            "Shows a random SFW picture of an anime girl saying 'Baka!'. Images from nekos.life.",
        examples: ['\nB...B...Baka!'],
    },
    foxgirl: {
        description: 'Shows a random SFW foxgirl picture. Images from nekos.life.',
        examples: ['\nFoxgirls.'],
        additionalInfo:
            'Foxgirl: Similar to catgirl in which it is usually a young girl, but instead of having cat like characteristics, they have fox like characteristics. Rarer then the annoying catgirl, the far superior foxgirl is sometimes under appreciated and very often mistaken for a catgirl by those too ignorant to know the differance.\nA foxgirl is usually interpreted as the human form of a Kitsune from Japanese folklore, and possess the same abilities such as shapeshifting and growing multiple tails as they age and grow in power and knowledge. They normally age much slower than humans and catgirls.',
    },
    gah: {
        description:
            "Shows a SFW picture of an anime girl saying 'Oh my god!'. Images from nekobot.xyz.",
        examples: ['\nOh my god!'],
    },
    gecg: {
        description:
            'Shows a random SFW genetically engineered catgirl picture. Images from nekos.life.',
        examples: [
            '\nEvery dollar spent on ... anything ... is a dollar not spent on genetically engineered catgirls for domestic ownership.',
        ],
    },
    holo: {
        description: 'Shows a random SFW holo picture.\nImages from nekos.life.',
        examples: ['\nNot hololive'],
        additionalInfo:
            'Holo: A female demi-human wolf and the protagonist of the light novel, manga and anime series Spice & Wolf.',
    },
    kanna: {
        description: 'Shows a random SFW kanna picture.\nImages from nekobot.xyz.',
        examples: ['\nProtecc'],
        additionalInfo:
            'Kanna Kamui: Also known as Kanna Kobayashi, is one of the main characters in Kobayashi-san Chi no Maid Dragon and the main protagonist of Kobayashi-san Chi no Maid Dragon: Kanna no Nichijou. Kanna is a young female dragon, who is exiled from her world as a consequence of her pranks.',
    },
    kemonomimi: {
        description: 'Shows a random SFW kemonomimi picture.\nImages from nekos.life.',
        examples: ['\nElon Musk Prayge'],
        additionalInfo:
            'Kemonomimi: A person with animal characteristics, such as cat ears, cat tails, whiskers, paws.',
    },
    neko: {
        description: 'Shows a random SFW neko picture.\nImages from nekos.life and nekobot.xyz.',
        examples: ['\nCatgirls.'],
    },
    smug: {
        description: 'Shows a random SFW smug picture.\nImages from nekos.life.',
        examples: ['\nSmug.'],
    },
    waifu: {
        description: 'Shows a random SFW waifu picture.\nImages from nekos.life.',
        examples: [
            "\nYour waifu doesn't exist. Even if she does, she still doesn't love you back. *cry",
        ],
    },
    wallpaper: {
        description: 'Shows a random SFW wallpaper picture.\nImages from nekos.life.',
        examples: ['\nAnime wallpapers.'],
    },
};

const NL_IMAGES = {
    avatar: ['avatar'],
    baka: ['baka'],
    foxgirl: ['foxGirl'],
    gecg: ['gecg'],
    holo: ['holo'],
    kemonomimi: ['kemonomimi'],
    neko: ['neko', 'nekoGif'],
    smug: ['smug'],
    waifu: ['waifu'],
    // wallpaper: ['wallpaper'],
};

const NB_IMAGES = {
    gah: ['gah'],
    kanna: ['kanna'],
    neko: ['neko'],
};

export default class extends Command {
    constructor() {
        super('sfw-image', {
            aliases: [...new Set(Object.keys(NL_IMAGES).concat(Object.keys(NB_IMAGES)))],
            subAliases: IMAGES,
            nsfw: false,
            error: {
                'No Result': {
                    message: 'Failed to fetch image!',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
            },
        });
    }

    async exec(message: Message) {
        try {
            const method = message.util?.parsed?.alias;
            let image = null;
            if (Object.keys(NL_IMAGES).includes(method)) {
                image = (
                    await this.client.nekoslife.sfw[this.client.util.random(NL_IMAGES[method])]()
                ).url;
                if (Object.keys(NB_IMAGES).includes(method)) {
                    const nbimage = await axios
                        .get(
                            `https://nekobot.xyz/api/image?type=${this.client.util.random(
                                NB_IMAGES[method]
                            )}`
                        )
                        .then(res => res.data.message);
                    if (nbimage === 'Unknown Image Type') {
                        return this.client.commandHandler.emitError(
                            new Error('No Result'),
                            message,
                            this
                        );
                    }
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
                if (image === 'Unknown Image Type') {
                    return this.client.commandHandler.emitError(
                        new Error('No Result'),
                        message,
                        this
                    );
                }
            }
            if (!image) {
                return this.client.commandHandler.emitError(
                    new Error('No Result'),
                    message,
                    this
                );
            }
            const embed = this.client.embeds
                .default()
                .setDescription(`[Click here if image failed to load](${image})`)
                .setImage(image);
            return this.client.embeds
                .richDisplay({ image: true })
                .addPage(embed)
                .useCustomFooters()
                .run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...'),
                    '',
                    {
                        time: 180000,
                    }
                );
        } catch (err) {
            this.client.logger.error(err);
        }
    }
}
