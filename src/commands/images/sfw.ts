import { Command } from '@structures/Command';
import { Message } from 'discord.js';
import axios from 'axios';

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
    wallpaper: ['wallpaper'],
} as const;

const NB_IMAGES = {
    gah: ['gah'],
    kanna: ['kanna'],
    neko: ['neko'],
} as const;

export default class extends Command {
    constructor() {
        super('sfw-image', {
            aliases: [...new Set(Object.keys(NL_IMAGES).concat(Object.keys(NB_IMAGES)))],
            areMultipleCommands: true,
            channel: 'guild',
            nsfw: false,
            description: {
                content: 'Sends a SFW anime image of @.',
                example: ['smug', 'gecg'],
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
