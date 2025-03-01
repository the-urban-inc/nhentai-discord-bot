import { Client, Command, UserError } from '@structures';
import { ApplicationCommandOptionType, ApplicationCommandType, AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { SFW_METHODS } from '@api/images';
import Fuse from 'fuse.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'sfw-image',
            type: ApplicationCommandType.ChatInput,
            description: 'Searches for a SFW image',
            cooldown: 5000,
            options: [
                {
                    name: 'tag',
                    type: ApplicationCommandOptionType.String,
                    description: "Tag to search for (type 'list' to see tag list)",
                    autocomplete: true,
                    required: true,
                },
            ],
        });
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.options.getFocused() || !interaction.options.getFocused().length) {
            return await interaction.respond([
                {
                    name: 'list',
                    value: 'list',
                },
            ]);
        }
        await interaction.respond(
            new Fuse(Object.keys(SFW_METHODS), {
                includeScore: true,
                threshold: 0.1,
            })
                .search(interaction.options.getFocused(), { limit: 25 })
                .map(f => {
                    return {
                        name: f.item,
                        value: f.item,
                    };
                })
        );
    }

    async exec(interaction: CommandInteraction) {
        const tag = interaction.options.get('tag').value as string;
        if (tag === 'list') {
            return interaction.editReply(
                `Here's the tag list: ${Object.keys(SFW_METHODS)
                    .map(x => `\`${x}\``)
                    .join(',  ')}.`
            );
        }
        if (!(tag in SFW_METHODS)) {
            throw new UserError('UNKNOWN_TAG', tag);
        }
        const image = await this.client.images.fetch('sfw', tag as keyof typeof SFW_METHODS);
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
