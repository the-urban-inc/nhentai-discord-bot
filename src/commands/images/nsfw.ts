import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import axios from 'axios';

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
} as const;

const NB_IMAGES = {
    anal: ['hanal'],
    ass: ['hass'],
    boobs: ['hboobs'],
    hentai: ['hentai'],
    nsfw_kemonomimi: ['kemonomimi'],
    kitsune: ['hkitsune'],
    midriff: ['hmidriff'],
    nsfw_neko: ['hneko'],
    paizuri: ['paizuri'],
    tentacle: ['tentacle'],
    thigh: ['hthigh'],
} as const;

export default class extends Command {
    constructor() {
        super('nsfw-image', {
            aliases: [...new Set(Object.keys(NL_IMAGES).concat(Object.keys(NB_IMAGES)))],
            areMultipleCommands: true,
            channel: 'guild',
            nsfw: true,
            description: {
                content: 'Sends a NSFW anime image of @.',
                example: ['thigh', 'ass', 'boobs'],
            },
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
                    image = this.client.util.random([image, nbimage])
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
                throw new Error()
            }
            const embed = this.client.util
                .embed()
                .setDescription(`[Click here if image failed to load](${image})`)
                .setImage(image);
            this.client.embeds
                .richDisplay({ image: true })
                .addPage(embed)
                .useCustomFooters()
                .run(this.client, message, await message.channel.send('Searching ...'));
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
