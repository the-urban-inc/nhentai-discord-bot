import { Client, Command, UserError } from '@structures';
import { CommandInteraction, Message } from 'discord.js';
import { Sort } from '@api/nhentai';
import { User, Server, Blacklist } from '@database/models';

export default class C extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'tag',
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

    async before(interaction: CommandInteraction) {
        try {
            let user = await User.findOne({ userID: interaction.user.id }).exec();
            if (!user) {
                user = await new User({
                    blacklists: [],
                    anonymous: true,
                }).save();
            }
            this.blacklists = user.blacklists;
            this.anonymous = user.anonymous;
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

    async exec(
        interaction: CommandInteraction,
        { internal, message }: { internal?: boolean; message?: Message } = {}
    ) {
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
        message = await displayList.run(
            interaction,
            `> **Searching for ${type}** **\`${tag}\`**`,
            message ?? 'editReply'
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
