import { Client, Command, UserError } from '@structures';
import { CommandInteraction, Message } from 'discord.js';
import { Sort } from '@api/nhentai';
import { User, Server, Blacklist } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'search',
            description: 'Searches nhentai for specified query',
            cooldown: 20000,
            nsfw: true,
            options: [
                {
                    name: 'query',
                    type: 'STRING',
                    description: 'The query to search for on nhentai',
                    required: true,
                },
                {
                    name: 'page',
                    type: 'INTEGER',
                    description: 'Page number (default: 1)',
                },
                {
                    name: 'sort',
                    type: 'STRING',
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

    async before(interaction: CommandInteraction, internal?: boolean, message?: Message) {
        try {
            let user = await User.findOne({ userID: interaction.user.id }).exec();
            if (!user) {
                user = await new User({
                    blacklists: [],
                    anonymous: true,
                }).save();
            }
            this.blacklists = user.blacklists;
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
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

    async exec(interaction: CommandInteraction, internal?: boolean, message?: Message) {
        await this.before(interaction);
        const query = interaction.options.get('query').value as string;
        const page = (interaction.options.get('page')?.value as number) ?? 1;
        const sort = (interaction.options.get('sort')?.value as string) ?? 'recent';

        if (/^\d+$/.test(query.replace('#', ''))) {
            const command = this.client.commandHandler.findCommand('g');
            interaction.options.get('query')!.value = +query.replace('#', '');
            return command.exec(interaction);
        }

        const data =
            sort === 'recent'
                ? await this.client.nhentai
                      .search(query, page)
                      .catch((err: Error) => this.client.logger.error(err.message))
                : await this.client.nhentai
                      .search(query, page, sort as Sort)
                      .catch((err: Error) => this.client.logger.error(err.message));
        if (!data || !data.result || !data.result.length) {
            throw new UserError('NO_RESULT', query);
        }
        const { result, num_pages, num_results } = data;
        if (page < 1 || page > num_pages) {
            throw new UserError('INVALID_PAGE_INDEX', page, num_pages);
        }

        const { displayList, rip } = this.client.embeds.displayGalleryList(
            result,
            this.danger,
            this.blacklists,
            {
                page,
                num_pages,
                num_results,
            }
        );
        if (rip) this.warning = true;
        message = await displayList.run(
            interaction,
            `> **Searching for** **\`${query}\`**`,
            message
        );

        if (!this.danger && this.warning) {
            internal
                ? await message.reply(this.client.util.communityGuidelines()).then(msg =>
                      setTimeout(() => {
                          if (msg.deletable) msg.delete();
                      }, 180000)
                  )
                : await interaction.followUp(this.client.util.communityGuidelines());
        }
    }
}
