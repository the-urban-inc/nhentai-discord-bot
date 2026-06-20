import { Client, Command, UserError } from '@structures';
import {
    ApplicationCommandType,
    ApplicationCommandOptionType,
    CommandInteraction,
} from 'discord.js';
import { Blacklist } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'random',
            type: ApplicationCommandType.ChatInput,
            description: 'Shows a random gallery',
            cooldown: 5000,
            nsfw: true,
            options: [
                {
                    name: 'page',
                    type: ApplicationCommandOptionType.Integer,
                    description: 'Starting page number (default: 1)',
                },
                {
                    name: 'more',
                    type: ApplicationCommandOptionType.Boolean,
                    description: 'Views more info about the doujin (default: false)',
                },
            ],
        });
    }

    async before(
        interaction: CommandInteraction
    ): Promise<{ danger: boolean; blacklists: Blacklist[] }> {
        try {
            const user = await this.client.db.user.findOrCreate(interaction.user.id);
            const blacklists = user.blacklists;
            const server = await this.client.db.server.findOrCreate(interaction.guild!.id);
            return { danger: server.settings.danger, blacklists };
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${(err as Error).message}`);
        }
    }

    async after(interaction: CommandInteraction, ctx: { danger: boolean; warning: boolean }) {
        if (ctx.danger && ctx.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }

    async exec(interaction: CommandInteraction) {
        const { danger, blacklists } = await this.before(interaction);
        let warning = false;
        const more = interaction.options.get('more')?.value as boolean;
        const page = (interaction.options.get('page')?.value as number) ?? 1;
        let id = await this.client.db.cache.safeRandom(
            danger,
            blacklists.map(({ id }) => id)
        ).catch(err => {
            this.client.logger.warn('MariaDB random failed', err.message);
            return null;
        });
        if (!id) {
            id = (await this.client.nhentai.random()).gallery.id;
        }

        if (!page && !more) {
            let gallery = await this.client.db.cache.getDoujin(id as number).catch(err => {
                this.client.logger.warn('MariaDB cache miss for', id, err.message);
                return null;
            });
            if (!gallery) {
                const data = await this.client.nhentai.g(id as number);
                if (!data || !data.gallery) {
                    throw new UserError('NO_RESULT', String(id));
                }
                await this.client.db.cache.addDoujin(data.gallery).catch(err => {
                    this.client.logger.warn('Failed to cache doujin', id, err.message);
                });
                gallery = data.gallery;
            }
            const { displayGallery, rip } = this.client.embeds.displaySingleGallery(
                gallery,
                { danger: danger, blacklists: blacklists }
            );
            if (rip) warning = true;
            await displayGallery.run(interaction, `> **Searching for** **\`${id}\`**`);
            return await this.after(interaction, { danger, warning });
        }

        const data = await this.client.nhentai.g(id, more);
        if (!data || !data.gallery) {
            throw new UserError('NO_RESULT');
        }
        const { gallery } = data;
        if (page < 1 || page > gallery.num_pages) {
            throw new UserError('INVALID_PAGE_INDEX', page, gallery.num_pages);
        }

        const { displayGallery, rip } = this.client.embeds.displaySingleGallery(
            gallery,
            { startPage: page - 1, danger: danger, blacklists: blacklists }
        );
        if (rip) warning = true;
        await displayGallery.run(interaction, `> **Searching for random gallery**`);

        if (more) {
            const { related, comments } = data;

            const { displayList: displayRelated, rip } = this.client.embeds.displayGalleryList(
                related ?? [],
                { danger: danger }
            );
            if (rip) warning = true;
            await displayRelated.run(interaction, '> **More Like This**');

            if (!(comments ?? []).length) return;
            const displayComments = this.client.embeds.displayCommentList(comments ?? []);
            await displayComments.run(interaction, '> `💬` **Comments**');
        }

        await this.after(interaction, { danger, warning });
    }
}
