import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import axios from 'axios';
import { NEKOBOT_TAGS } from '@nhentai/utils/constants';

export default class extends Command {
    constructor() {
        super('nekobot', {
            category: 'images',
            aliases: ['nekobot', 'nb'],
            channel: 'guild',
            description: {
                content: 'Fetch NSFW images from nekobot.xyz by tags.',
                usage: '<tag>',
                examples: [''],
            },
            args: [
                {
                    id: 'tag',
                    type: 'lowercase',
                },
            ],
        });
    }

    async exec(message: Message, { tag }: { tag: string }) {
        if (!tag || !Object.keys(NEKOBOT_TAGS).includes(tag))
            return message.channel.send(
                this.client.embeds.clientError(
                    `Unknown tag. The following tags are available: ${Object.keys(NEKOBOT_TAGS)
                        .map(x => `\`${x}\``)
                        .join(' ')}`
                )
            );
        const image = await axios
            .get(
                `https://nekobot.xyz/api/image?type=${this.client.util.random(
                    NEKOBOT_TAGS[tag as keyof typeof NEKOBOT_TAGS]
                )}`
            )
            .then(res => res.data.message);
        if (image === 'Unknown Image Type')
            return message.channel.send(this.client.embeds.internalError(image));
        const embed = this.client.util
            .embed()
            .setDescription(`[Click here if image failed to load](${image})`)
            .setImage(image);
        this.client.embeds
            .richDisplay({ image: true })
            .addPage(embed)
            .useCustomFooters()
            .run(this.client, message, await message.channel.send('Searching ...'));
    }
}
