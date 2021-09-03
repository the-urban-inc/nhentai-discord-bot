import { Client, Command, UserError } from '@structures';
import { CommandInteraction} from 'discord.js';
import { User, Server, Blacklist, Language } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'home',
            type: 'CHAT_INPUT',
            description:
                "Shows nhentai homepage. Includes 'Popular Now' section for the first page.",
            cooldown: 20000,
            nsfw: true,
            options: [
                {
                    name: 'page',
                    type: 'INTEGER',
                    description: 'Page number (default: 1)',
                },
            ],
        });
    }

    danger = false;
    warning = false;
    blacklists: Blacklist[] = [];
    language: Language = { preferred: [], query: false, follow: false };

    async before(interaction: CommandInteraction) {
        try {
            let user = await User.findOne({ userID: interaction.user.id }).exec();
            if (!user) {
                user = await new User({
                    userID: interaction.user.id,
                    blacklists: [],
                    anonymous: true,
                    language: {
                        preferred: [],
                        query: false,
                        follow: false,
                    },
                }).save();
            }
            this.blacklists = user.blacklists;
            this.language = user.language;
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    userID: interaction.user.id,
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
        const page = (interaction.options.get('page')?.value as number) ?? 1;
        const data = await this.client.nhentai
            .home(page)
            .catch(err => this.client.logger.error(err.message));
        if (!data || !data.result || !data.result.length) {
            throw new UserError('NO_RESULT');
        }
        const { result, num_pages } = data;
        if (page < 1 || page > num_pages) {
            throw new UserError('INVALID_PAGE_INDEX', page, num_pages);
        }

        if (page === 1) {
            const popularNow = data.popular_now;
            const { displayList: displayPopular, rip } = this.client.embeds.displayGalleryList(
                popularNow,
                this.danger,
                this.blacklists,
                this.language.query ? this.language.preferred : [],
                {
                    page,
                    num_pages,
                }
            );
            if (rip) this.warning = true;
            await displayPopular.run(interaction, '> `🔥` **Popular Now**');
        }

        const newUploads = result;
        const { displayList: displayNew, rip } = this.client.embeds.displayGalleryList(
            newUploads,
            this.danger,
            this.blacklists,
            this.language.query ? this.language : null,
            {
                page,
                num_pages,
            }
        );
        if (rip) this.warning = true;

        await displayNew.run(
            interaction,
            page === 1 ? '> `🧻` **New Uploads**' : '',
            page === 1 ? 'followUp' : 'editReply'
        );

        if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }
}
