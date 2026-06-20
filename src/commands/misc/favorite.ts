import { Client, Command } from '@structures';
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    CommandInteraction,
    User as DiscordUser,
} from 'discord.js';
import { User, Blacklist } from '@database/models';
import { PartialGallery } from '@api/nhentai';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'favorite',
            type: ApplicationCommandType.ChatInput,
            description: "Shows your (or your friend's) favorite",
            cooldown: 10000,
            nsfw: true,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user to search for',
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

    async exec(interaction: CommandInteraction) {
        const { danger, blacklists, anonymous } = await this.before(interaction);
        let warning = false;
        const member = (interaction.options.get('user')?.user as DiscordUser) ?? interaction.user;
        const user = await User.findOne({
            userID: member.id,
        }).exec();
        if (member.id !== interaction.user.id && anonymous) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle('❤️\u2000Favorites List')
                        .setDescription(
                            "This person has turned their incognito mode on. Therefore you can't view their favorite list."
                        ),
                ],
            });
        }
        if (!user) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle('❤️\u2000Favorites List')
                        .setDescription(
                            `${
                                member.id === interaction.user.id ? 'You have' : 'This person has'
                            } no favorite gallery!`
                        ),
                ],
            });
        }
        if (!user.favorites.length) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle('❤️\u2000Favorites List')
                        .setDescription(
                            `${
                                member.id === interaction.user.id ? 'You have' : 'This person has'
                            } no favorite gallery!`
                        ),
                ],
            });
        }
        const result: PartialGallery[] = [];
        const delay = (ms = 500) => new Promise(r => setTimeout(r, ms));
        for (const [i, code] of user.favorites.entries()) {
            await delay();
            let gallery = await this.client.db.cache.getDoujin(+code).catch(err => {
                this.client.logger.warn('MariaDB cache miss for', code, err.message);
                return null;
            });
            if (!gallery) {
                gallery = await this.client.nhentai
                    .g(+code)
                    .then(res => res.gallery)
                    .catch(() => null);
            }
            const progress = Math.floor((i / user.favorites.length) * 100);
            const totalBar = '░░░░░░░░░░░░░░░░';
            const progressBar = '▒'; // ░░░░░
            await interaction.editReply(
                `Fetching favorites list ${'.'.repeat((i % 3) + 1)} It may take a while${
                    gallery ? '' : `\nNo result found for ${code}. Skipping...`
                }\n[${
                    progressBar.repeat(Math.floor((totalBar.length / 100) * progress)) +
                    totalBar.substring(Math.floor((totalBar.length / 100) * progress) + 1)
                }] [${progress}%]`
            );
            if (!gallery) continue;
            result.push(gallery);
        }
        const { displayList, rip } = this.client.embeds.displayGalleryList(
            result,
            {
                danger: danger,
                blacklists: blacklists,
                language: { preferred: [], query: false, follow: false },
                additional_options: {
                    allowPreview: true,
                    galleryActions: ['love', 'remove'],
                },
            }
        );
        if (rip) warning = true;
        await displayList.run(
            interaction,
            `> **Favorites List of** **\`${member.tag}\`**\n> **Galleries are sorted by date added**`
        );
        if (!danger && warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }
}
