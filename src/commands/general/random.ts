import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import he from 'he';
import moment from 'moment';
import { Server } from '@inari/models/server';
import { Tag } from '@inari/struct/nhentai/src/struct';
import { ICON, FLAG_EMOJIS, BANNED_TAGS, BLOCKED_MESSAGE } from '@inari/utils/constants';

export default class extends Command {
    constructor() {
        super('random', {
            aliases: ['random'],
            channel: 'guild',
            nsfw: true,
            description: {
                content:
                    'Random doujin.\nRun with `--more` to include `More Like This` and `Comments`.',
                usage: '[--more] [--auto]',
                examples: ['', '--more', '--auto'],
            },
            args: [
                {
                    id: 'more',
                    match: 'flag',
                    flag: ['-m', '--more'],
                },
                {
                    id: 'auto',
                    match: 'flag',
                    flag: ['-a', '--auto'],
                },
            ],
        });
    }

    danger = false;
    warning = false;

    async before(message: Message) {
        try {
            let server = await Server.findOne({ serverID: message.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    settings: { danger: false },
                }).save();
            }
            this.danger = server.settings.danger;
            this.warning = false;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    async exec(message: Message, { more, auto, dontLogErr }: { more?: boolean; auto?: boolean; dontLogErr?: boolean }) {
        try {
            const doujin = await this.client.nhentai.random();

            let { tags, num_pages, upload_date } = doujin.details;
            let title = he.decode(doujin.details.title.english),
                id = doujin.details.id.toString();

            const info = this.client.util
                .embed()
                .setAuthor(title, ICON, `https://nhentai.net/g/${id}`)
                .setFooter(`ID : ${id}${auto ? '• React with 🇦 to start an auto session' : ''}`)
                .setTimestamp();

            const rip = this.client.util.hasCommon(
                tags.map(x => x.id.toString()),
                BANNED_TAGS
            );

            if (rip) this.warning = true;
            if (this.danger || !rip) info.setThumbnail(doujin.getCoverThumbnail());

            let t = new Map();
            tags.forEach((tag: Tag) => {
                let a = t.get(tag.type) || [];
                a.push(`**\`${tag.name}\`**\`(${tag.count.toLocaleString()})\``);
                t.set(tag.type, a);
            });

            [
                ['parody', 'Parodies'],
                ['character', 'Characters'],
                ['tag', 'Tags'],
                ['artist', 'Artists'],
                ['group', 'Groups'],
                ['language', 'Languages'],
                ['category', 'Categories'],
            ].forEach(
                ([key, fieldName]) =>
                    t.has(key) && info.addField(fieldName, this.client.util.gshorten(t.get(key)))
            );

            // info.addField('‏‏‎ ‎', `${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
            //     .addField('Pages', `**\`[${doujin.num_pages}]\`**`);
            info.addField('Pages', `**\`${num_pages}\`**`).addField(
                'Uploaded',
                moment(upload_date * 1000).fromNow()
            );

            if (this.danger || !rip) {
                const displayDoujin = this.client.embeds
                    .richDisplay({ auto, download: true })
                    .setInfo({ id, type: 'g', name: title })
                    .setInfoPage(info);
                doujin
                    .getPages()
                    .forEach((page: string) =>
                        displayDoujin.addPage(
                            this.client.util.embed().setImage(page).setTimestamp()
                        )
                    );
                await displayDoujin.run(
                    this.client,
                    message,
                    await message.channel.send('Searching for doujin ...')
                );
            } else {
                await this.client.embeds
                    .richDisplay({ image: true })
                    .addPage(info)
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Searching ...'));
            }

            if (more) {
                const { comments, related } = doujin;
                const displayRelated = this.client.embeds
                    .richDisplay({ removeRequest: false })
                    .useCustomFooters();
                for (const [
                    idx,
                    { title, id, language, dataTags, thumbnail },
                ] of related.entries()) {
                    const page = this.client.util
                        .embed()
                        .setTitle(`${he.decode(title)}`)
                        .setURL(`https://nhentai.net/g/${id}`)
                        .setDescription(
                            `**ID** : ${id}\u2000•\u2000**Language** : ${
                                FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'
                            }`
                        )
                        .setFooter(`Doujin ${idx + 1} of ${related.length}`)
                        .setTimestamp();
                    const prip = this.client.util.hasCommon(dataTags, BANNED_TAGS);
                    if (prip) this.warning = true;
                    if (this.danger || !prip) page.setImage(thumbnail.s);
                    displayRelated.addPage(page, id);
                }
                await displayRelated.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '**More Like This**'
                );

                if (!comments.length) return;
                const displayComments = this.client.embeds
                    .richDisplay({ love: false, removeRequest: false })
                    .useCustomFooters();
                for (const [
                    idx,
                    {
                        poster: { username, avatar_url },
                        body,
                        post_date,
                    },
                ] of comments.entries()) {
                    displayComments.addPage(
                        this.client.util
                            .embed()
                            .setAuthor(
                                `${he.decode(username)}`,
                                `https://i5.nhentai.net/${avatar_url}`
                            )
                            .setDescription(body)
                            .setFooter(
                                `Comment ${idx + 1} of ${
                                    comments.length
                                }\u2000•\u2000Posted ${moment(post_date * 1000).fromNow()}`
                            )
                    );
                }
                await displayComments.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '`💬` **Comments**'
                );
            }

            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ image: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Loading ...'));
            }
        } catch (err) {
            if (dontLogErr) return;
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
