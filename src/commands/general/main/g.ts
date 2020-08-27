import Command from '@nhentai/struct/bot/Command';
import { Message, MessageEmbed } from 'discord.js';
import he from 'he';
import moment from 'moment';
import { Tag } from '@nhentai/struct/nhentai/src/struct';
import { ICON, FLAG_EMOJIS } from '@nhentai/utils/constants';
import { Server } from '@nhentai/models/server';
import { User } from '@nhentai/models/user';

export default class extends Command {
    constructor() {
        super('g', {
            category: 'general',
            aliases: ['g', 'get', 'doujin'],
            description: {
                content: 'Searches for a code on nhentai.',
                usage: '<code> [--auto]',
                examples: ['177013', '265918 --auto'],
            },
            args: [
                {
                    id: 'code',
                    type: 'string',
                    match: 'text',
                },
                {
                    id: 'auto',
                    match: 'flag',
                    flag: ['-a', '--auto'],
                },
            ],
            cooldown: 3000,
        });
    }

    async exec(message: Message, { code, auto }: { code: string; auto: boolean }) {
        if (!code)
            return message.channel.send(this.client.embeds.clientError('Code is not specified.'));
        try {
            const doujin = await this.client.nhentai.g(code);

            // points increase
            const min = 30,
                max = 50;
            const inc = Math.floor(Math.random() * (max - min)) + min;

            let title = he.decode(doujin.title.english),
                { id, tags, num_pages, upload_date, comments, related } = doujin,
                date = Date.now();

            if (message.guild) {
                // history record
                let serverHistory = {
                    author: message.author.tag,
                    id,
                    title,
                    date,
                };
                let server = await Server.findOne({ serverID: message.guild.id }).exec();
                if (!server) {
                    await new Server({
                        serverID: message.guild.id,
                        recent: [serverHistory],
                    }).save();
                } else {
                    server.recent.push(serverHistory);
                    await server.save();
                }

                // user record
                let userHistory = { id, title, date };
                let user = await User.findOne({ userID: message.author.id });
                if (!user) {
                    await new User({
                        userID: message.author.id,
                        history: { g: [userHistory] },
                        points: inc,
                    }).save();
                } else {
                    if (!user.history.g.find(x => x.id === id))
                        user.points = (user.points || 0) + inc;
                    // inc if new doujin
                    user.history.g.push(userHistory);
                    user.save();
                }
            }

            const info = new MessageEmbed()
                .setAuthor(title, ICON, `https://nhentai.net/g/${id}`)
                .setThumbnail(doujin.getCoverThumbnail())
                .setFooter(`ID : ${id}${auto ? '• React with 🇦 to start an auto session' : ''}`)
                .setTimestamp();

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

            const displayDoujin = this.client.embeds
                .richDisplay({ auto: auto })
                .setGID(id)
                .setInfoPage(info);
            doujin
                .getPages()
                .forEach((page: string) =>
                    displayDoujin.addPage(new MessageEmbed().setImage(page).setTimestamp())
                );
            await displayDoujin.run(await message.channel.send('Searching for doujin ...'));

            const displayRelated = this.client.embeds.richDisplay().useCustomFooters();
            for (const [idx, { title, id, language, thumbnail }] of related.entries()) {
                displayRelated.addPage(
                    new MessageEmbed()
                        .setTitle(`${he.decode(title)}`)
                        .setURL(`https://nhentai.net/g/${id}`)
                        .setDescription(
                            `**ID** : ${id}\u2000•\u2000**Language** : ${
                                FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'
                            }`
                        )
                        .setImage(thumbnail.s)
                        .setFooter(`Doujin ${idx + 1} of ${related.length}`)
                        .setTimestamp(),
                    id
                );
            }
            await displayRelated.run(await message.channel.send('**More Like This**'));

            if (!comments.length) return;
            const displayComments = this.client.embeds
                .richDisplay({ love: false })
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
                    new MessageEmbed()
                        .setAuthor(`${he.decode(username)}`, `https://i5.nhentai.net/${avatar_url}`)
                        .setDescription(body)
                        .setFooter(
                            `Comment ${idx + 1} of ${comments.length}\u2000•\u2000Posted ${moment(
                                post_date * 1000
                            ).fromNow()}`
                        )
                );
            }
            return displayComments.run(await message.channel.send('`💬` **Comments**'));
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
