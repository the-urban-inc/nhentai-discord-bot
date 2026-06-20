import { Client, Command, UserError } from '@structures';
import { ApplicationCommandOptionType, ApplicationCommandType, AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { Sort, TagResult } from '@api/nhentai';
import { Blacklist, Language } from '@database/models';
import Fuse from 'fuse.js';

export default class C extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'tag',
            type: ApplicationCommandType.ChatInput,
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
                    type: ApplicationCommandOptionType.String,
                    description: 'The tag to search for on nhentai',
                    required: true,
                    autocomplete: true,
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
                            name: k.match(/[A-Z][a-z]+|[0-9]+/g)!.join(' '),
                            value: Sort[k as keyof typeof Sort],
                        };
                    }),
                },
            ],
        });
    }

    clone() {
        return new C(this.client);
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!this.client.tags.has(interaction.commandName)) {
            return interaction.respond([]);
        }
        await interaction.respond(
            new Fuse(this.client.tags.get(interaction.commandName) ?? [], {
                includeScore: true,
                threshold: 0.1,
            })
                .search(interaction.options.getFocused(), { limit: 5 })
                .map(f => {
                    return {
                        name: f.item,
                        value: f.item,
                    };
                })
        );
    }

    async before(
        interaction: CommandInteraction
    ): Promise<{ danger: boolean; blacklists: Blacklist[]; anonymous: boolean; language: Language }> {
        try {
            const user = await this.client.db.user.findOrCreate(interaction.user.id);
            const blacklists = user.blacklists;
            const anonymous = user.anonymous;
            const language = user.language;
            const server = await this.client.db.server.findOrCreate(interaction.guild!.id);
            return { danger: server.settings.danger, blacklists, anonymous, language };
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${(err as Error).message}`);
        }
    }

    async run(
        interaction: CommandInteraction,
        page: number,
        ctx: { danger: boolean; blacklists: Blacklist[]; anonymous: boolean; language: Language },
        external = false
    ) {
        let warning = false;
        const type = interaction.commandName;
        const tag = interaction.options.get('query')!.value as string;
        const sort = (interaction.options.get('sort')?.value as string) ?? 'recent';
        const nhentaiAny = this.client.nhentai as unknown as Record<string, (q: string, page: number, sort?: Sort) => Promise<TagResult | void>>;
        const data =
            sort === 'recent'
                ? await nhentaiAny[type](tag.toLowerCase(), page).catch((err: Error) =>
                      this.client.logger.error(err.message)
                  )
                : await nhentaiAny[type](tag.toLowerCase(), page, sort as Sort).catch(
                      (err: Error) => this.client.logger.error(err.message)
                  );
        if (!data || !data.result || !data.result.length) {
            if (external) return;
            throw new UserError('NO_RESULT', tag);
        }
        const { result, tag_id, num_pages, num_results } = data;

        if (page < 1 || page > num_pages) {
            if (external) return;
            throw new UserError('INVALID_PAGE_INDEX', page, num_pages);
        }

        const id = tag_id.toString(),
            name = tag.toLowerCase();

        if (!ctx.anonymous) {
            await this.client.db.user.history(interaction.user.id, {
                id,
                type,
                name,
                author: interaction.user.id,
                guild: interaction.guild!.id,
                date: Date.now(),
            });
        }

        const { displayList, rip } = this.client.embeds.displayGalleryList(
            result,
            {
                danger: ctx.danger,
                blacklists: ctx.blacklists,
                language: ctx.language,
                page,
                num_pages,
                num_results,
                additional_options: {
                    info: { id, name, type },
                    allowPreview: true,
                    galleryActions: ['love', 'follow', 'blacklist', 'remove'],
                    onBoundary: async (direction) => {
                        await this.run(interaction, direction === 'next' ? page + 1 : page - 1, ctx, true);
                    },
                },
            }
        );

        if (rip) warning = true;
        await displayList.run(interaction, `> **Searching for ${type}** **\`${tag}\`**`);

        if (!ctx.danger && warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }

    async exec(interaction: CommandInteraction) {
        const ctx = await this.before(interaction);
        const page = (interaction.options.get('page')?.value as number) ?? 1;

        await this.run(interaction, page, ctx);
    }
}
