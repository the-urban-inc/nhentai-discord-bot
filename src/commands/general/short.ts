import { Client, Command, UserError } from '@structures';
import { CommandInteraction } from 'discord.js';
import { decode } from 'he';
import { User, Server, Blacklist } from '@database/models';
import { PartialGallery } from '@api/nhentai';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'short',
            type: 'CHAT_INPUT',
            description: 'Searches nhentai for specified code (with shortened output)',
            cooldown: 5000,
            nsfw: true,
            options: [
                {
                    name: 'query',
                    type: 'INTEGER',
                    description: 'The code to search for on nhentai',
                    required: true,
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

    async after(interaction: CommandInteraction, gallery: PartialGallery) {
        if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
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
            guild: interaction.guild.id,
            date: Date.now(),
        };

        if (interaction.guild && !this.anonymous) {
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
                    ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                });
            }
        }
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const code = interaction.options.get('query').value as number;
        let gallery = await this.client.db.cache.getDoujin(code);
        if (!gallery) {
            const data = await this.client.nhentai
                .g(code)
                .catch(err => this.client.logger.error(err.message));
            if (!data || !data.gallery) {
                throw new UserError('NO_RESULT', String(code));
            }
            await this.client.db.cache.addDoujin(data.gallery);
            gallery = data.gallery;
        }
        const { thumb, rip } = this.client.embeds.displayShortGallery(
            gallery,
            this.danger,
            this.blacklists
        );
        if (rip) this.warning = true;
        await interaction.editReply({
            embeds: [thumb],
        });

        await this.after(interaction, gallery);
    }
}
