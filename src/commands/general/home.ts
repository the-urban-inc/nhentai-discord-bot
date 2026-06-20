import { Client, Command, UserError } from '@structures';
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    CommandInteraction,
    Message,
} from 'discord.js';
import { Blacklist, Language } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'home',
            type: ApplicationCommandType.ChatInput,
            description:
                "Shows nhentai homepage. Includes 'Popular Now' section for the first page.",
            cooldown: 20000,
            nsfw: true,
            options: [
                {
                    name: 'page',
                    type: ApplicationCommandOptionType.Integer,
                    description: 'Page number (default: 1)',
                },
            ],
        });
    }

    async before(
        interaction: CommandInteraction
    ): Promise<{ danger: boolean; blacklists: Blacklist[]; language: Language }> {
        try {
            const user = await this.client.db.user.findOrCreate(interaction.user.id);
            const blacklists = user.blacklists;
            const language = user.language;
            const server = await this.client.db.server.findOrCreate(interaction.guild!.id);
            return { danger: server.settings.danger, blacklists, language };
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${(err as Error).message}`);
        }
    }

    async run(
        interaction: CommandInteraction,
        page: number,
        ctx: { danger: boolean; blacklists: Blacklist[]; language: Language },
        external = false
    ) {
        let warning = false;
        const data = await this.client.nhentai.home(page);
        if (!data || !data.result || !data.result.length) {
            if (external) return;
            throw new UserError('NO_RESULT');
        }
        const { result, num_pages } = data;
        if (page < 1 || page > num_pages) {
            if (external) return;
            throw new UserError('INVALID_PAGE_INDEX', page, num_pages);
        }

        if (page === 1) {
            const popularNow = data.popular_now ?? [];
            const { displayList: displayPopular, rip } = this.client.embeds.displayGalleryList(
                popularNow,
                {
                    danger: ctx.danger,
                    blacklists: ctx.blacklists,
                    language: ctx.language,
                    page,
                    num_pages,
                    additional_options: {
                        allowPreview: true,
                        galleryActions: ['love', 'remove'],
                    },
                }
            );
            if (rip) warning = true;
            await displayPopular.run(interaction, '> `🔥` **Popular Now**');
        }

        const newUploads = result;
        const { displayList: displayNew, rip } = this.client.embeds.displayGalleryList(
            newUploads,
            {
                danger: ctx.danger,
                blacklists: ctx.blacklists,
                language: ctx.language,
                page,
                num_pages,
                additional_options: {
                    allowPreview: true,
                    galleryActions: ['love', 'remove'],
                    onBoundary: async (direction, buttonInteraction) => {
                        const newPage = direction === 'next' ? page + 1 : page - 1;
                        if (page === 1 && direction === 'next') {
                            await (buttonInteraction.message as Message).delete();
                        }
                        await this.run(interaction, newPage, ctx, true);
                    },
                },
            }
        );
        if (rip) warning = true;

        await displayNew.run(
            interaction,
            page === 1 ? '> `🧻` **New Uploads**' : '',
            page === 1 ? 'followUp' : 'editReply'
        );

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
