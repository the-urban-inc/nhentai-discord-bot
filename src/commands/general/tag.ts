import { Client, Command, UserError } from '@structures';
import { CommandInteraction } from 'discord.js';
import { Sort } from '@api/nhentai';
import { User, Server, Blacklist, Language } from '@database/models';

export default class C extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'tag',
            type: 'CHAT_INPUT',
            description: 'Searches nhentai for specified tag',
            cooldown: 20000,
            nsfw: true,
            clone: {
                keyword: 'tag',
                clones: ['tag', 'artist', 'character', 'category', 'group', 'parody', 'language'],
            },
            options: [
                {
                    name: 'query',
                    type: 'STRING',
                    description: 'The tag to search for on nhentai',
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

    clone() {
        return new C(this.client);
    }

    anonymous = true;
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
            this.anonymous = user.anonymous;
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

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const type = interaction.commandName;
        const tag = interaction.options.get('query').value as string;
        const page = (interaction.options.get('page')?.value as number) ?? 1;
        const sort = (interaction.options.get('sort')?.value as string) ?? 'recent';

        const data =
            sort === 'recent'
                ? await this.client.nhentai[type](tag.toLowerCase(), page).catch((err: Error) =>
                      this.client.logger.error(err.message)
                  )
                : await this.client.nhentai[type](tag.toLowerCase(), page, sort as Sort).catch(
                      (err: Error) => this.client.logger.error(err.message)
                  );
        if (!data || !data.result || !data.result.length) {
            throw new UserError('NO_RESULT', tag);
        }
        const { result, tag_id, num_pages, num_results } = data;

        if (page < 1 || page > num_pages) {
            throw new UserError('INVALID_PAGE_INDEX', page, num_pages);
        }

        const id = tag_id.toString(),
            name = tag.toLowerCase();

        if (!this.anonymous) {
            await this.client.db.user.history(interaction.user.id, {
                id,
                type: tag,
                name,
                author: interaction.user.id,
                guild: interaction.guild.id,
                date: Date.now(),
            });
        }

        const { displayList, rip } = this.client.embeds.displayGalleryList(
            result,
            this.danger,
            this.blacklists,
            this.language.query ? this.language : null,
            {
                page,
                num_pages,
                num_results,
                additional_options: {
                    info: { id, name },
                },
            }
        );

        if (rip) this.warning = true;
        await displayList.run(interaction, `> **Searching for ${type}** **\`${tag}\`**`);

        if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }
}
