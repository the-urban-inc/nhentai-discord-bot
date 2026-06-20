import { Client, Command, UserError } from '@structures';
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    CommandInteraction,
    MessageFlags,
} from 'discord.js';
import { decode } from 'he';
import { Blacklist } from '@database/models';
import { PartialGallery } from '@api/nhentai';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'short',
            type: ApplicationCommandType.ChatInput,
            description: 'Searches nhentai for specified code (with shortened output)',
            cooldown: 5000,
            nsfw: true,
            options: [
                {
                    name: 'query',
                    type: ApplicationCommandOptionType.Integer,
                    description: 'The code to search for on nhentai',
                    required: true,
                },
            ],
        });
    }

    async before(
        interaction: CommandInteraction
    ): Promise<{ danger: boolean; blacklists: Blacklist[]; anonymous: boolean }> {
        try {
            const user = await this.client.db.user.findOrCreate(interaction.user.id);
            const blacklists = user.blacklists;
            const anonymous = user.anonymous;
            const server = await this.client.db.server.findOrCreate(interaction.guild!.id);
            return { danger: server.settings.danger, blacklists, anonymous };
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${(err as Error).message}`);
        }
    }

    async after(
        interaction: CommandInteraction,
        gallery: PartialGallery,
        ctx: { danger: boolean; warning: boolean; anonymous: boolean }
    ) {
        if (!ctx.danger && ctx.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }

        const min = 30,
            max = 50;
        const inc = Math.floor(Math.random() * (max - min)) + min;
        const history = {
            id: gallery.id.toString(),
            type: 'g',
            name: decode(gallery.title.english),
            author: interaction.user.id,
            guild: interaction.guild!.id,
            date: Date.now(),
        };

        if (interaction.guild && !ctx.anonymous) {
            await this.client.db.server.history(interaction.guild.id, history);
            await this.client.db.user.history(interaction.user.id, history);
            const leveledUp = await this.client.db.xp.save(
                'add',
                'exp',
                interaction.user.id,
                interaction.guild.id,
                inc
            );
            if (leveledUp) {
                await interaction.followUp({
                    content: 'Congratulations! You have leveled up!',
                    ...((interaction.options.get('private')?.value as boolean) && {
                        flags: MessageFlags.Ephemeral,
                    }),
                });
            }
        }
    }

    async exec(interaction: CommandInteraction) {
        const { danger, blacklists, anonymous } = await this.before(interaction);
        let warning = false;
        const code = interaction.options.get('query')!.value as number;
        let gallery = await this.client.db.cache.getDoujin(code).catch(err => {
            this.client.logger.warn('MariaDB cache miss for', code, err.message);
            return null;
        });
        if (!gallery) {
            const data = await this.client.nhentai.g(code);
            if (!data || !data.gallery) {
                throw new UserError('NO_RESULT', String(code));
            }
            await this.client.db.cache.addDoujin(data.gallery).catch(err => {
                this.client.logger.warn('Failed to cache doujin', code, err.message);
            });
            gallery = data.gallery;
        }
        const { thumb, rip } = this.client.embeds.displayShortGallery(
            gallery,
            danger,
            blacklists
        );
        if (rip) warning = true;
        await interaction.editReply({
            embeds: [thumb],
        });

        await this.after(interaction, gallery, { danger, warning, anonymous });
    }
}
