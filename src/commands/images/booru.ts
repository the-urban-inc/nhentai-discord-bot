import { Client, Command, UserError } from '@structures';
import { CommandInteraction } from 'discord.js';
import { Server } from '@database/models';
import { search } from 'booru';
import { decode } from 'he';
import { BANNED_TAGS_TEXT } from '@constants';
import SearchResults from 'booru/dist/structures/SearchResults';

const SITES = [
    'e621.net',
    'e926.net',
    'hypnohub.net',
    'danbooru.donmai.us',
    'konachan.com',
    'konachan.net',
    'yande.re',
    'gelbooru.com',
    'rule34.xxx',
    'safebooru.org',
    'tbib.org',
    'xbooru.com',
    'derpibooru.org',
] as const;

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'booru',
            type: 'CHAT_INPUT',
            description: 'Shows random posts with specified tag on specified booru site',
            cooldown: 5000,
            nsfw: true,
            options: [
                {
                    name: 'site',
                    type: 'STRING',
                    description: 'The site to search on',
                    required: true,
                    choices: SITES.map(k => {
                        return {
                            name: k,
                            value: k === 'rule34.xxx' ? 'api.rule34.xxx' : k,
                        };
                    }),
                },
                {
                    name: 'tags',
                    type: 'STRING',
                    description:
                        'The tag(s) to search for. Separate tags with spaces. Wrap multi-word tags in quotes "".',
                    required: true,
                },
                {
                    name: 'page',
                    type: 'INTEGER',
                    description: 'The page to display',
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

    async run(interaction: CommandInteraction, page: number, external = false) {
        const site = interaction.options.get('site').value as (typeof SITES)[number];
        const tags = interaction.options.get('tags').value as string;

        const res = await search(
            site,
            this.client.util.splitWithQuotes(tags).map(t => t.replace(/ /g, '_')),
            { limit: 25, page }
        ).catch(err => {
            throw err;
        }); // 25 is more than enough for a page
        if (
            !res ||
            !res.posts.length ||
            !res.posts.filter(x => this.client.util.isUrl(x.fileUrl)).length
        ) {
            if (external) return;
            throw new UserError('NO_RESULT', tags);
        }
        const dataPosts = res.posts.filter(x => this.client.util.isUrl(x.fileUrl));
        const display = this.client.embeds.paginator(this.client, {
            startView: 'thumbnail',
            collectorTimeout: 180000,
            commandPage: page,
        });
        dataPosts.forEach(data => {
            const image = data.fileUrl,
                source = data.source,
                original = data.postView,
                createdAt = data.createdAt;
            let tags = data.tags;
            tags = tags.map(x => decode(x).replace(/_/g, ' '));
            const prip = this.client.util.hasCommon(tags, BANNED_TAGS_TEXT);
            if (prip) this.warning = true;
            const embed = this.client.embeds
                .default()
                .setDescription(
                    `**Tags** : ${this.client.util.gshorten(
                        tags.map((x: string) => `\`${x}\``),
                        '\u2000',
                        2048
                    )}\n\n[Original post](${original})\u2000•\u2000[Source](${source})\u2000•\u2000[Click here if image failed to load](${image})`
                )
                .setFooter({
                    text: `Page ${page} of ?`,
                })
                .setTimestamp(createdAt);
            if (this.danger || !prip) embed.setImage(image);
            display.addPage('thumbnail', { embed });
        });
        await display.run(interaction, `> **Searching for posts with tag(s)** **\`${tags}\`**`);

        if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);

        const page = (interaction.options.get('page')?.value as number) ?? 1;

        await this.run(interaction, page);
    }
}
