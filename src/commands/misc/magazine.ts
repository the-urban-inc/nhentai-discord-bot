import { Client, Command, Paginator, UserError } from '@structures';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Server } from '@database/models';
import { BANNED_TAGS_TEXT } from '@constants';

const ICON = 'https://awa-con.com/wp-content/uploads/2019/10/FAKKU.png';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'magazine',
            description: 'Searches for magazine on Fakku',
            cooldown: 10000,
            nsfw: true,
            options: [
                {
                    name: 'query',
                    type: 'STRING',
                    description: 'The query to search for',
                    required: true,
                },
            ],
        });
    }

    danger = false;
    warning = false;

    async before(interaction: CommandInteraction) {
        try {
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

    paginate(display: Paginator, mags: string[], embed: MessageEmbed) {
        const page = display.pages.info.length,
            l = 10;
        let description = '';
        for (
            let i = 0, mag = mags[i + page * l];
            i + page * l < mags.length && i < l;
            i++, mag = mags[i + page * l]
        ) {
            description += mag;
        }
        display.addPage('info', { embed: embed.setDescription(description) });
        if (mags.length > (page + 1) * l) return this.paginate(display, mags, embed);
        return display;
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const query = interaction.options.get('query').value as string;
        const magazines = this.client.fakku.findMagazine(query);
        if (!magazines || !magazines.length) {
            throw new UserError('NO_RESULT', query);
        }
        if (magazines[0].score < 0.000001) {
            const { title, url, image } = magazines[0].item;
            const magazine = await this.client.fakku.fetchSingleMagazine(url);
            const { publisher, coverIllust, artists, doujins } = magazine;
            const info = this.client.embeds
                .default()
                .setTitle(title)
                .setURL(`https://fakku.net${url}`)
                .setTimestamp();
            if (publisher.length) {
                info.setDescription(
                    `${publisher}\n\n**Cover Illustration**: ${coverIllust}\n\n**Artists**: ${artists}`
                );
            }
            if (!doujins || !doujins.length)
                return interaction.editReply({ embeds: [info.setThumbnail(image)] });
            const display = this.client.embeds.paginator(this.client, {
                collectorTimeout: 300000,
            });
            const results = doujins.map(
                ({ title, artist, thumbnail, description, price, tags }) => {
                    const prip = this.client.util.hasCommon(
                        tags.map(t => t.name),
                        BANNED_TAGS_TEXT
                    );
                    if (prip) this.warning = true;
                    const embed = this.client.embeds
                        .default()
                        .setAuthor(artist.name, ICON, `https://fakku.net${artist.href}`)
                        .setTitle(title.name)
                        .setURL(`https://fakku.net${title.href}`)
                        .setDescription(this.client.util.shorten(description, '\n', 2000));
                    if (this.danger || !prip)
                        embed.setThumbnail(
                            thumbnail.startsWith('https') ? thumbnail : 'https:' + thumbnail
                        );
                    if (price.length) embed.addField('Price', price);
                    embed
                        .addField(
                            'Tags',
                            this.client.util.gshorten(
                                tags.map((d: { name: string; href: string }) => `\`${d.name}\``)
                            )
                        )
                        .setTimestamp();
                    return { embed };
                }
            );
            if (!this.warning) info.setThumbnail(image);
            await display
                .addPage('info', { embed: info })
                .addPage('info', results)
                .run(interaction, `> **Searching Fakku Magazines for** **\`${query}\`**`);
            if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
                this.client.warned.add(interaction.user.id);
                await interaction.followUp(this.client.util.communityGuidelines());
            }
            return;
        }
        const display = this.client.embeds.paginator(this.client, {
            collectorTimeout: 180000,
        });
        const embed = this.client.embeds.default().setTitle('Magazines List');
        return this.paginate(
            display,
            magazines.map(({ item: { title, url } }) => `• [${title}](https://fakku.net${url})\n`),
            embed
        ).run(interaction, `> **Searching Fakku Magazines for** **\`${query}\`**`);
    }
}
