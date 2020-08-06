import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { NhentaiClient } from '@nhentai/struct/Client';
import { random } from '@nhentai/utils/extensions';
import { Embeds } from '@nhentai/utils/embeds';
import { NEKOSLIFE_TAGS } from '@nhentai/utils/constants';

export class Nekoslife extends Command {
    constructor() {
        super('nekoslife', {
            category: 'images',
            aliases: ['nekoslife', 'nl'],
            channel: 'guild',
            description: {
                content: 'Fetch NSFW images from nekos.life by tags.',
                usage: '[tag]',
                examples: ['']
            },
            args: [{
                id: 'tag',
                type: 'lowercase'
            }],
            cooldown: 3000
        });
    }

    async exec(message: Message, { tag }: { tag: string }) {
        if (!tag || !Object.keys(NEKOSLIFE_TAGS).includes(tag)) return message.channel.send(Embeds.error(`Unknown tag. The following tags are available: ${Object.keys(NEKOSLIFE_TAGS).map(x => `\`${x}\``).join(' ')}`));
        let client = this.client as NhentaiClient;
        const image = await client.nekoslife.nsfw[random(NEKOSLIFE_TAGS[tag as keyof typeof NEKOSLIFE_TAGS]) as keyof typeof client.nekoslife.nsfw]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${image.url})`).setImage(image.url);
        Embeds.display(client).addPage(embed).useCustomFooters().run(message, message, ['images']);
    }
};
