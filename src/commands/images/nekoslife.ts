import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import { NEKOSLIFE_TAGS } from '@nhentai/utils/constants';

export default class extends Command {
    constructor() {
        super('nekoslife', {
            aliases: ['nekoslife', 'nl'],
            channel: 'guild',
            description: {
                content: 'Fetch NSFW images from nekos.life by tags.',
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
        if (!tag || !Object.keys(NEKOSLIFE_TAGS).includes(tag))
            return message.channel.send(
                this.client.embeds.clientError(
                    `Unknown tag. The following tags are available: ${Object.keys(NEKOSLIFE_TAGS)
                        .map(x => `\`${x}\``)
                        .join(' ')}`
                )
            );
        const methods = NEKOSLIFE_TAGS[tag as keyof typeof NEKOSLIFE_TAGS];
        const _ = Math.floor(Math.random() * 2);
        const image = await this.client.nekoslife.nsfw[methods[methods.length === 1 ? 0 : _]]();
        const embed = this.client.util
            .embed()
            .setDescription(`[Click here if image failed to load](${image.url})`)
            .setImage(image.url);
        this.client.embeds
            .richDisplay({ image: true })
            .addPage(embed)
            .useCustomFooters()
            .run(this.client, message, await message.channel.send('Searching ...'));
    }
}
