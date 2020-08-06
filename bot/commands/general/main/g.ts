import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import he from 'he';
import moment from 'moment';
import { NhentaiClient } from '@nhentai/struct/Client';
import { Tag } from '@nhentai/struct/nhentai/src/struct';
import { gshorten } from '@nhentai/utils/extensions';
import { Embeds } from '@nhentai/utils/embeds';
import { Logger } from '@nhentai/utils/logger';
import { ICON, FLAG_EMOJIS } from '@nhentai/utils/constants';
import { Server } from '@nhentai/models/server';
import { User } from '@nhentai/models/user';

export class GCommand extends Command {
	constructor() {
		super('g', {
            category: 'general',
			aliases: ['g', 'get', 'doujin'],
			description: {
                content: 'Searches for a code on nhentai.',
                usage: '<code> [--auto]',
                examples: ['177013', '265918 --auto']
            },
            args: [{
                id: 'code',
                type: 'string',
                match: 'text'
            }, {
                id: 'auto',
                match: 'flag',
                flag: ['-a', '--auto']
            }],
            cooldown: 3000
		});
    }

	async exec(message: Message, { code, auto }: { code: string, auto: boolean }) {
        if (!code) return message.channel.send(Embeds.error('Code is not specified.'));
        const doujin = await (this.client as NhentaiClient).nhentai.g(code).catch(err => Logger.error(err));
        if (!doujin) return message.channel.send(Embeds.error('An unexpected error has occurred. Are you sure this is an existing doujin?'));

        // any error
        let undefinedError = () => 
            message.channel.send(
                Embeds.error('An unexpected error has occurred. Are you sure this is an existing doujin?')
            );

        // points increase
        const min = 30, max = 50;
        const inc = Math.floor(Math.random() * (max - min)) + min;

        let title = he.decode(doujin.title.english),
            { id, tags, num_pages, upload_date, comments, related } = doujin,
            date = Date.now();

        if (message.guild) {
            try {
                // history record
                let serverHistory = { 
                    author: message.author.tag, id, title, date
                };
                let server = await Server.findOne({ serverID: message.guild.id }).exec();
                if (!server) {
                    await new Server({
                        serverID: message.guild.id,
                        recent: [serverHistory]
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
                        points: inc
                    }).save();
                } else {
                    if (!user.history.g.find(x => x.id === id))
                        user.points = (user.points || 0) + inc;
                    // inc if new doujin
                    user.history.g.push(userHistory);
                    user.save();
                }
            } catch (err) {
                undefinedError();
                return Logger.error(err);
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
            ['category', 'Categories']
        ]
        .forEach(
            ([key, fieldName]) => 
                t.has(key)
                && info.addField(fieldName, gshorten(t.get(key)))
        )

        // info.addField('‏‏‎ ‎', `${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
        info.addField('Pages', `**\`${num_pages}\`**`)
        // info.addField('Pages', `**\`[${doujin.num_pages}]\`**`);
            .addField('Uploaded', moment(upload_date * 1000).fromNow());

        const displayDoujin = Embeds.display(this.client as NhentaiClient).setGID(id).setInfoPage(info);
        if (auto) displayDoujin.useAutoMode();
        doujin.getPages().forEach((page: string) => displayDoujin.addPage(new MessageEmbed().setImage(page).setTimestamp()));
        const displayDoujinHandler = await displayDoujin.run(message, await message.channel.send('Searching for doujin ...'));

        const displayRelated = Embeds.display(this.client as NhentaiClient).useCustomFooters().useMultipleDisplay(displayDoujin);
        for (const [idx, { title, id, language, thumbnail }] of related.entries()) {
            displayRelated.addPage(
                new MessageEmbed()
                    .setTitle(`${he.decode(title)}`)
                    .setURL(`https://nhentai.net/g/${id}`)
                    .setDescription(`**ID** : ${id}\u2000•\u2000**Language** : ${FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'}`)
                    .setImage(thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${related.length}`)
                    .setTimestamp(),
                id
            )
        }
        const displayRelatedHandler = await displayRelated.run(message, await message.channel.send('**More Like This**'));

        if (!comments.length) return;
        const displayComments = Embeds.display(this.client as NhentaiClient).useCustomFooters().useMultipleDisplay(displayRelated);
        for (const [idx, { poster: { username, avatar_url }, body, post_date }] of comments.entries()) {
            displayComments.addPage(new MessageEmbed()
                .setAuthor(`${he.decode(username)}`, `https://i5.nhentai.net/${avatar_url}`)
                .setDescription(body)
                .setFooter(`Comment ${idx + 1} of ${comments.length}\u2000•\u2000Posted ${moment(post_date * 1000).fromNow()}`))
        }
        return displayComments.run(message, await message.channel.send('`💬` **Comments**'), ['love']);
	}
};