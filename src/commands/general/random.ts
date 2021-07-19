import { Client, Command, UserError } from '@structures';
import { CommandInteraction, Message } from 'discord.js';
import { User, Server, Blacklist } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'random',
            description: 'Shows a random gallery',
            cooldown: 20000,
            nsfw: true,
            options: [
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
        const more = interaction.options.get('more')?.value as boolean;
        const page = (interaction.options.get('page')?.value as number) ?? 1;
        const data = await this.client.nhentai
            .random(more)
            .catch(err => this.client.logger.error(err.message));
        if (!data || !data.gallery) {
            throw new UserError('NO_RESULT');
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
        message = await displayGallery.run(
            interaction,
            `> **Searching for random gallery**`,
            message
        );

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
