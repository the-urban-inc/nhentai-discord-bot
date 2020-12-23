import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import he from 'he';
import moment from 'moment';
import { User } from '@inari/models/user';
import { Server } from '@inari/models/server';
import { Blacklist } from '@inari/models/tag';
import { Gallery } from '@inari/struct/nhentai/src/struct';
import { ICON, FLAG_EMOJIS, BANNED_TAGS, BLOCKED_MESSAGE } from '@inari/utils/constants';

export default class extends Command {
    constructor() {
        super('g', {
            aliases: ['g', 'get', 'doujin', 'read'],
            channel: 'guild',
            nsfw: true,
            description: {
                content:
                    'Searches for a code on nhentai.\nRun with `--more` to include `More Like This` and `Comments`.',
                usage: '<code> [--more] [--auto]',
                examples: ['177013', '265918 --auto'],
            },
            args: [
                {
                    id: 'code',
                    type: 'string',
                    match: 'text',
                },
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
                {
                    id: 'page',
                    match: 'option',
                    flag: ['--page=', '-p='],
                    default: '1',
                },
            ],
        });
    }

    anonymous = true;
    danger = false;
    warning = false;
    blacklists: Blacklist[] = [];

    async before(message: Message) {
        try {
            let user = await User.findOne({ userID: message.author.id }).exec();
            if (!user) {
                user = await new User({
                    blacklists: [],
                    anonymous: true,
                }).save();
            }
            this.blacklists = user.blacklists;
            this.anonymous = user.anonymous;
            let server = await Server.findOne({ serverID: message.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    settings: { danger: false },
                }).save();
            }
            this.danger = server.settings.danger;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    async exec(
        message: Message,
        { code, more, auto, page }: { code: string; more?: boolean; auto?: boolean; page?: string }
    ) {
        if (!code)
            return message.channel.send(this.client.embeds.clientError('Code is not specified.'));
        try {
            const doujin: Gallery = await this.client.nhentai.g(code, more);

            if (!doujin.details) throw new Error("Code doesn't exist.");

            // points increase
            const min = 30,
                max = 50;
            const inc = Math.floor(Math.random() * (max - min)) + min;

            let { tags, num_pages, upload_date } = doujin.details;
            let pageNum = parseInt(page, 10);
            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > num_pages)
                return message.channel.send(
                    this.client.embeds.clientError(
                        'Page number is not an integer or is out of range.'
                    )
                );
            let id = doujin.details.id.toString(),
                title = he.decode(doujin.details.title.english),
                date = Date.now();
            let history = {
                id,
                type: 'g',
                name: title,
                author: message.author.id,
                guild: message.guild.id,
                date,
            };

            if (message.guild && !this.anonymous) {
                await this.client.db.Server.history(message, history);
                await this.client.db.User.history(message.author, history);
                const leveledUp = await this.client.db.XP.save('add', 'exp', message, inc);
                if (leveledUp) {
                    message.channel
                        .send(this.client.embeds.info('Congratulations! You have leveled up!'))
                        .then(message => message.delete({ timeout: 10000 }));
                }
            }

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
            tags.forEach(tag => {
                const { id, type, name, count } = tag;
                let a = t.get(type) || [];
                let s = `**\`${name}\`**\`(${count.toLocaleString()})\``;
                if (this.blacklists.some(bl => bl.id === id.toString())) s = `~~${s}~~`;
                a.push(s);
                t.set(type, a);
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
                    await message.channel.send('Searching for doujin ...'),
                    '',
                    {
                        startPage: pageNum - 1,
                    }
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
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
