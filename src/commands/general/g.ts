import { Client, Command, UserError } from '@structures';
import { CommandInteraction, Message } from 'discord.js';
import { decode } from 'he';
import { User, Server, Blacklist } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'g',
            type: 'CHAT_INPUT',
            description: 'Searches nhentai for specified code',
            cooldown: 20000,
            nsfw: true,
            options: [
                {
                    name: 'query',
                    type: 'INTEGER',
                    description: 'The code to search for on nhentai',
                    required: true,
                },
                {
                    name: 'page',
                    type: 'INTEGER',
                    description: 'Starting page number (default: 1)',
                },
                {
                    name: 'more',
                    type: 'BOOLEAN',
                    description: 'Views more info about the doujin (default: false)',
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

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const code = interaction.options.get('query').value as number;
        const more = interaction.options.get('more')?.value as boolean;
        const page = (interaction.options.get('page')?.value as number) ?? 1;
        const data = await this.client.nhentai
            .g(code, more)
            .catch(err => this.client.logger.error(err.message));
        if (!data || !data.gallery) {
            throw new UserError('NO_RESULT', String(code));
        }
        const { gallery } = data;
        if (page < 1 || page > gallery.num_pages) {
            throw new UserError('INVALID_PAGE_INDEX', page, gallery.num_pages);
        }

        const { displayGallery, rip } = this.client.embeds.displayFullGallery(
            gallery,
            page - 1,
            this.danger,
            this.blacklists
        );
        if (rip) this.warning = true;
        await displayGallery.run(interaction, `> **Searching for** **\`${code}\`**`);

        if (more) {
            const { related, comments } = data;

            const { displayList: displayRelated, rip } = this.client.embeds.displayGalleryList(
                related,
                this.danger
            );
            if (rip) this.warning = true;
            await displayRelated.run(interaction, '> **More Like This**');

            if (!comments.length) return;
            const displayComments = this.client.embeds.displayCommentList(comments);
            await displayComments.run(interaction, '> `💬` **Comments**');
        }

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
            if (leveledUp)
                await interaction.followUp({
                    content: 'Congratulations! You have leveled up!',
                    ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                });
        }
    }
}
