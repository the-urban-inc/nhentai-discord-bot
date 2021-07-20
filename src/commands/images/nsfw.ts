import { Client, Command, UserError } from '@structures';
import { CommandInteraction } from 'discord.js';
import { NSFW_METHODS } from '@api/images';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'nsfw-image',
            description: 'Searches for a NSFW image',
            cooldown: 5000,
            nsfw: true,
            options: [
                {
                    name: 'tag',
                    type: 'STRING',
                    description: 'Tag to search for (type list to see tag list)',
                    required: true,
                },
            ],
        });
    }

    async exec(interaction: CommandInteraction) {
        const tag = interaction.options.get('tag').value as string;
        if (tag === 'list') {
            return interaction.editReply(
                `Here's the tag list: ${Object.keys(NSFW_METHODS)
                    .map(x => `\`${x}\``)
                    .join(',  ')}.`
            );
        }
        if (!(tag in NSFW_METHODS)) {
            throw new UserError('UNKNOWN_TAG', tag);
        }
        const image = await this.client.images.fetch('nsfw', tag as keyof typeof NSFW_METHODS);
        if (!this.client.util.isUrl(image)) {
            throw new UserError('NO_RESULT', tag);
        }
        return this.client.embeds
            .paginator(this.client, {
                startView: 'thumbnail',
                image,
                collectorTimeout: 300000,
            })
            .addPage('thumbnail', {
                embed: this.client.embeds
                    .default()
                    .setDescription(`[Click here if image failed to load](${image})`)
                    .setImage(image),
            })
            .run(interaction);
    }
}
