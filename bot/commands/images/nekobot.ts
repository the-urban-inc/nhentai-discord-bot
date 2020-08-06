import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';
import { NhentaiClient } from '@nhentai/struct/Client';
import { random } from '@nhentai/utils/extensions';
import { Embeds } from '@nhentai/utils/embeds';
import { NEKOBOT_TAGS } from '@nhentai/utils/constants';

export class Nekobot extends Command {
    constructor() {
        super('nekobot', {
            category: 'images',
            aliases: ['nekobot', 'nb'],
            channel: 'guild',
            description: {
                content: 'Fetch NSFW images from nekobot.xyz by tags.',
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
        if (!tag || !Object.keys(NEKOBOT_TAGS).includes(tag)) return message.channel.send(Embeds.error(`Unknown tag. The following tags are available: ${Object.keys(NEKOBOT_TAGS).map(x => `\`${x}\``).join(' ')}`));
        const image = await axios.get(`https://nekobot.xyz/api/image?type=${random(NEKOBOT_TAGS[tag as keyof typeof NEKOBOT_TAGS])}`).then((res) => res.data.message);
        if (image === 'Unknown Image Type') return message.channel.send(Embeds.error());
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${image})`).setImage(image);
        Embeds.display(this.client as NhentaiClient).addPage(embed).useCustomFooters().run(message, message, ['images']);
    }
};
