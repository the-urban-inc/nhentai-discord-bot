import { Command } from '@structures';
import { Message } from 'discord.js';
import he from 'he';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { GalleryResult } from '@api/nhentai';
import { BANNED_TAGS } from '@utils/constants';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];

export default class extends Command {
    constructor() {
        super('quiz', {
            aliases: ['quiz'],
            nsfw: true,
            cooldown: 10000,
            description: {
                content:
                    'Starts a quiz session: try to guess the title of the displayed random doujin page picked from 1 of 4 choices.\nNote: There can only be one quiz session at a time.',
                usage: '',
                examples: ['\nTry to guess the title!'],
            },
            error: {
                'No Result': {
                    message: 'Failed to fetch a random gallery!',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
                'Parsing Failed': {
                    message: 'An error occurred while parsing choices.',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
            },
        });
    }

    danger = false;
    warning = false;
    blacklists: Blacklist[] = [];

    async before(message: Message) {
        try {
            let user = await User.findOne({ userID: message.author.id }).exec();
            if (!user) {
                user = await new User({
                    blacklists: [],
                }).save();
            }
            this.blacklists = user.blacklists;
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

    async exec(message: Message) {
        try {
            if (!this.client.quizOngoing.get(message.author.id)) {
                this.client.quizOngoing.set(message.author.id, true);
            } else {
                return this.client.embeds
                    .richDisplay({ removeOnly: true, removeRequest: false })
                    .addPage(
                        this.client.embeds
                            .default()
                            .setColor('#ff0000')
                            .setAuthor('❌\u2000Rejected')
                            .setDescription(
                                `You already have an ongoing quiz session. Please finish your quiz session first before starting a new one.`
                            )
                    )
                    .useCustomFooters()
                    .run(
                        this.client,
                        message,
                        message // await message.channel.send('Loading ...')
                    );
            }
            let result: void | GalleryResult = null;
            for (let i = 0; i < 3; i++) {
                result = await this.client.nhentai
                    .random(true)
                    .catch(err => this.client.logger.error(err.message));
                if (!result || !result.gallery?.tags) {
                    continue;
                }
                const tags = result.gallery.tags;
                const rip = this.client.util.hasCommon(
                    tags.map(x => x.id.toString()),
                    BANNED_TAGS
                );
                if (this.danger || !rip) break;
            }
            if (!result || !result.gallery?.tags) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const { gallery, related } = result;
            const page = this.client.util.random(this.client.nhentai.getPages(gallery));
            const menu = this.client.embeds
                .richMenu({
                    template: this.client.embeds
                        .default()
                        .setAuthor(this.client.user?.username, this.client.user?.displayAvatarURL())
                        .setTitle(`Guess which doujin is this picture from?`)
                        .setDescription(
                            'Use number reactions to select an option. Your first choice will be your final choice. No cheating!'
                        )
                        .setImage(page)
                        .setTimestamp(),
                })
                .useCustomFooters();
            related.splice(3, 5);
            related.push(gallery);
            const choices = this.client.util
                .shuffle(related)
                .map(({ id, title: { english }, tags }) => {
                    const title = he.decode(english);
                    const t = new Map();
                    tags.sort((a, b) => b.count - a.count);
                    tags.forEach(tag => {
                        const { id, type, name, count } = tag;
                        const a = t.get(type) || [];
                        let s = `**\`${name}\`**\u2009\`(${
                            count >= 1000 ? `${Math.floor(count / 1000)}K` : count
                        })\``;
                        // let s = `**\`${name}\`** \`(${count.toLocaleString()})\``;
                        if (this.blacklists.some(bl => bl.id === id.toString())) s = `~~${s}~~`;
                        a.push(s);
                        t.set(type, a);
                    });
                    return {
                        id,
                        title,
                        artist: this.client.util.gshorten(t.get('artist'), '\u2009\u2009'),
                    };
                });
            choices.forEach(({ id, title, artist }) => {
                menu.addChoice(+id, title, `Artists: ${artist}`);
            });
            const answer = choices.findIndex(({ id }) => gallery.id === id);
            if (answer === -1) {
                return this.client.commandHandler.emitError(
                    new Error('Parsing Failed'),
                    message,
                    this
                );
            }
            const handler = await menu.run(
                this.client,
                message,
                message, // await message.channel.send('Searching ...'),
                `> **Guess the doujin • [** ${message.author.tag} **]**`,
                {
                    time: 30000,
                }
            );
            const choice = await handler.selection;
            const embed = this.client.embeds.default().setFooter('Quiz session ended');
            const done = this.client.embeds
                .richDisplay({ removeOnly: true, removeRequest: false })
                .useCustomFooters();
            if (choice === null) {
                this.client.quizOngoing.set(message.author.id, false);
                if (message.deleted || handler.message.deleted) return;
                return done
                    .addPage(
                        embed
                            .setColor('#ffff00')
                            .setAuthor('⌛\u2000Timed out')
                            .setDescription(
                                `The session timed out as you did not answer within 30 seconds. The correct answer was **${
                                    answer + 1
                                } ${choices[answer].title}**.`
                            )
                    )
                    .run(
                        this.client,
                        message,
                        message // await message.channel.send('Loading ...')
                    );
            }
            if (choice === answer) {
                this.client.quizOngoing.set(message.author.id, false);
                return done
                    .addPage(
                        embed
                            .setColor('#008000')
                            .setAuthor('✅\u2000Correct')
                            .setDescription(
                                `Congratulations! You got it right!\nThe correct answer was **[${
                                    answer + 1
                                }] ${choices[answer].title}**.`
                            )
                    )
                    .run(
                        this.client,
                        message,
                        message // await message.channel.send('Loading ...')
                    );
            }
            this.client.quizOngoing.set(message.author.id, false);
            return done
                .addPage(
                    embed
                        .setColor('#ff0000')
                        .setAuthor('❌\u2000Wrong Answer')
                        .setDescription(
                            `Unfortunately, that was the wrong answer.\nThe correct answer was **[${
                                answer + 1
                            }] ${choices[answer].title}**.\nYou chose **[${choice + 1}]**.`
                        )
                )
                .run(
                    this.client,
                    message,
                    message // await message.channel.send('Loading ...')
                );
        } catch (err) {
            this.client.logger.error(err.message);
        }
    }
}
