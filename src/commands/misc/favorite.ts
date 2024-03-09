import { Client, Command } from '@structures';
import { CommandInteraction, User as DiscordUser } from 'discord.js';
import { User, Server, Blacklist } from '@database/models';
import { GalleryResult, PartialGallery } from '@api/nhentai';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'favorite',
            type: 'CHAT_INPUT',
            description: "Shows your (or your friend's) favorite",
            cooldown: 10000,
            nsfw: true,
            options: [
                {
                    name: 'user',
                    type: 'USER',
                    description: 'The user to search for',
                },
            ],
        });
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
                    userID: interaction.user.id,
                    blacklists: [],
                    anonymous: true,
                }).save();
            }
            this.blacklists = user.blacklists;
            this.anonymous = user.anonymous;
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
        const member = (interaction.options.get('user')?.user as DiscordUser) ?? interaction.user;
        const user = await User.findOne({
            userID: member.id,
        }).exec();
        if (member.id !== interaction.user.id && this.anonymous) {
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
        let result: PartialGallery[] = [];
        const delay = (ms = 500) => new Promise(r => setTimeout(r, ms));
        for (const [i, code] of user.favorites.entries()) {
            await delay();
            let gallery = await this.client.db.cache.getDoujin(+code);
            const progress = Math.floor((i / user.favorites.length) * 100);
            const totalBar = '░░░░░░░░░░░░░░░░';
            const progressBar = '▒'; // ░░░░░
            await interaction.editReply(
                `Fetching favorites list ${'.'.repeat(i % 3 + 1)} It may take a while${gallery ? '' : `\nNo result found for ${code}. Skipping...`}\n[${
                    progressBar.repeat((totalBar.length / 100) * progress) +
                    totalBar.substring((totalBar.length / 100) * progress + 1)
                }] [${progress}%]`
            );
            if (!gallery) {
                gallery = (await this.client.nhentai.g(+code))?.gallery;
                if (!gallery) continue;
            }
            result.push(gallery);
        }
        const { displayList, rip } = this.client.embeds.displayLazyGalleryList(
            result,
            this.danger,
            this.blacklists
        );
        if (rip) this.warning = true;
        await displayList.run(
            interaction,
            `> **Favorites List of** **\`${member.tag}\`**\n> **Galleries are sorted by date added**`
        );
        if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }
}
