import { Client, Command, UserError } from '@structures';
import { CommandInteraction } from 'discord.js';
import { Server } from '@database/models';
import { search } from 'booru';
import { decode } from 'he';
import { BANNED_TAGS_TEXT } from '@constants';

const SITES = {
    'e621.net': 'e621',
    'e926.net': 'e926',
    'hypnohub.net': 'hypnohub',
    'danbooru.donmai.us': 'danbooru',
    'konachan.com': 'konac',
    'konachan.net': 'konan',
    'yande.re': 'yandere',
    'gelbooru.com': 'gelbooru',
    'rule34.xxx': 'rule34',
    'safebooru.org': 'safebooru',
    'tbib.org': 'tbib',
    'xbooru.com': 'xbooru',
    'rule34.paheal.net': 'paheal',
    'derpibooru.org': 'derpibooru',
};

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
                    choices: Object.keys(SITES).map(k => {
                        return {
                            name: k,
                            value: SITES[k],
                        };
                    }),
                },
                {
                    name: 'tag',
                    type: 'STRING',
                    description: 'The tag to search for',
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

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const site = interaction.options.get('site').value as keyof typeof SITES;
        const tag = interaction.options.get('tag').value as string;
        const res = await search(site, tag.replace(/ /g, '_'), { limit: 25, random: true }).catch(
            err => this.client.logger.error(err)
        ); // 25 is more than enough for a page
        if (
            !res ||
            !res.posts.length ||
            !res.posts.filter(x => this.client.util.isUrl(x.fileUrl)).length
        ) {
            throw new UserError('NO_RESULT', tag);
        }
        const dataPosts = res.posts.filter(x => this.client.util.isUrl(x.fileUrl));
        const display = this.client.embeds.paginator(this.client, {
            startView: 'thumbnail',
            collectorTimeout: 180000,
        });
        dataPosts.forEach(data => {
            const image = data.fileUrl,
                original = data.postView;
            let tags = data.tags;
            tags = tags.map(x => decode(x).replace(/_/g, ' '));
            const prip = this.client.util.hasCommon(tags, BANNED_TAGS_TEXT);
            if (prip) this.warning = true;
            const embed = this.client.embeds
                .default()
                .setDescription(
                    `**Tags** : ${this.client.util.shorten(
                        tags.map((x: string) => `\`${x}\``).join('\u2000'),
                        '\u2000'
                    )}\n\n[Original post](${original})\u2000•\u2000[Click here if image failed to load](${image})`
                );
            if (this.danger || !prip) embed.setImage(image);
            display.addPage('thumbnail', { embed });
        });
        await display.run(interaction, `> **Searching for posts with tag** **\`${tag}\`**`);
        if (!this.danger && this.warning && !this.client.warned.has(interaction.user.id)) {
            this.client.warned.add(interaction.user.id);
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }
}
