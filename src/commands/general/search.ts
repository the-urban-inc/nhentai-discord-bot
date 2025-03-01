import { Client, Command, UserError } from '@structures';
import { ApplicationCommandOptionType, ApplicationCommandType, CommandInteraction } from 'discord.js';
import { Sort } from '@api/nhentai';
import { User, Server, Blacklist, Language } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'search',
            type: ApplicationCommandType.ChatInput,
            description: 'Searches nhentai for specified query',
            cooldown: 20000,
            nsfw: true,
            options: [
                {
                    name: 'query',
                    type: ApplicationCommandOptionType.String,
                    description: 'The query to search for on nhentai',
                    required: true,
                },
                {
                    name: 'page',
                    type: ApplicationCommandOptionType.Integer,
                    description: 'Page number (default: 1)',
                },
                {
                    name: 'sort',
                    type: ApplicationCommandOptionType.String,
                    description: 'Doujin sort method (default: recent)',
                    choices: Object.keys(Sort).map(k => {
                        return {
                            name: k.match(/[A-Z][a-z]+|[0-9]+/g).join(' '),
                            value: Sort[k],
                        };
                    }),
                },
            ],
        });
    }

    danger = false;
    warning = false;
    blacklists: Blacklist[] = [];
    language: Language = { preferred: [], query: false, follow: false };

    async before(interaction: CommandInteraction) {
        try {
            let user = await User.findOne({ userID: interaction.user.id }).exec();
            if (!user) {
                user = await new User({
                    userID: interaction.user.id,
                    blacklists: [],
                    anonymous: true,
                    language: {
                        preferred: [],
                        query: false,
                        follow: false,
                    },
                }).save();
            }
            this.blacklists = user.blacklists;
            this.language = user.language;
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    serverID: interaction.guild.id,
                    settings: { danger: false },
                }).save();
            }
            this.danger = server.settings.danger;
            this.warning = false;
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${err.message}`);
        }
    }

    async run(interaction: CommandInteraction, page: number, external = false) {
        const query = interaction.options.get('query').value as string;
        const sort = (interaction.options.get('sort')?.value as string) ?? 'recent';
        const data =
            sort === 'recent'
                ? await this.client.nhentai
                      .search(query, page)
                      .catch((err: Error) => this.client.logger.error(err.message))
                : await this.client.nhentai
                      .search(query, page, sort as Sort)
                      .catch((err: Error) => this.client.logger.error(err.message));
        if (!data || !data.result || !data.result.length) {
            if (external) return;
            throw new UserError('NO_RESULT', query);
        }
        const { result, num_pages, num_results } = data;
        if (page < 1 || page > num_pages) {
            if (external) return;
            throw new UserError('INVALID_PAGE_INDEX', page, num_pages);
        }

        const { displayList, rip } = this.client.embeds.displayGalleryList(
            result,
            this.danger,
            this.blacklists,
            this.language,
            {
                page,
                num_pages,
                num_results,
                additional_options: {
                    commandPage: page,
                },
            }
        );
        if (rip) this.warning = true;
        await displayList.run(interaction, `> **Searching for** **\`${query}\`**`);

        if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const query = interaction.options.get('query').value as string;
        const page = (interaction.options.get('page')?.value as number) ?? 1;

        if (/^\d+$/.test(query.replace('#', ''))) {
            const command = this.client.commands.get('g') as Command;
            interaction.commandName = 'g';
            interaction.options.get('query')!.value = +query.replace('#', '');
            return command.exec(interaction);
        }

        await this.run(interaction, page);
    }
}
