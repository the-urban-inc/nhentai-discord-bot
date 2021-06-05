import { Command } from '@structures';
import { Message } from 'discord.js';
import he from 'he';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { Gallery, GalleryResult } from '@api/nhentai';
import { BANNED_TAGS } from '@utils/constants';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];

export default class extends Command {
    constructor() {
        super('quiz', {
            aliases: ['quiz'],
            nsfw: true,
            cooldown: 30000,
            typing: false,
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
    iteration = 0;
    gallery: Gallery = null;
    related: Gallery[] = null;
    rawChoices: Gallery[] = [];
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
            this.iteration = 0;
            this.gallery = null;
            this.related = null;
            this.rawChoices = [];
            this.blacklists = [];
            this.danger = server.settings.danger;
            this.warning = false;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    async fetchRandomDoujin() {
        if (this.iteration++ >= 3) return;
        let result: void | GalleryResult = null;
        for (let i = 0; i < 5; i++) {
            result = await this.client.nhentai
                .random(true)
                .catch(err => this.client.logger.error(err.message));
            if (
                !result ||
                !result.gallery.tags ||
                typeof result.gallery.tags[Symbol.iterator] !== 'function'
            ) {
                continue;
            }
            const tags = result.gallery.tags;
            const rip = this.client.util.hasCommon(
                tags.map(x => x.id.toString()),
                BANNED_TAGS
            );
            if (this.danger || !rip) break;
        }
        if (!result) return this.fetchRandomDoujin();
        this.gallery = result.gallery;
        this.related = result.related;
        this.related.splice(3, 5);
        this.related.push(this.gallery);
        const titles = this.rawChoices.map(({ title }) => he.decode(title.english).toLowerCase());
        if ([...new Set(titles)].length < titles.length) return this.fetchRandomDoujin();
    }

    async exec(message: Message) {
        try {
            await this.fetchRandomDoujin();
            if (
                !this.gallery ||
                !this.gallery.tags ||
                typeof this.gallery.tags[Symbol.iterator] !== 'function' ||
                this.iteration > 3
            ) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const page = this.client.util.random(this.client.nhentai.getPages(this.gallery));
            const menu = this.client.embeds
                .richMenu({
                    template: this.client.embeds
                        .default()
                        .setAuthor(message.author.tag, message.author.displayAvatarURL())
                        .setTitle(`Guess which doujin is this picture from?`)
                        .setDescription(
                            'Use number reactions to select an option. Your first choice will be your final choice. No cheating!'
                        )
                        .setImage(page)
                        .setTimestamp(),
                })
                .useCustomFooters();
            const choices = this.client.util
                .shuffle(this.related)
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
                        url: `https://nhentai.net/g/${id}`,
                        title,
                        artist: this.client.util.gshorten(t.get('artist'), '\u2009\u2009'),
                    };
                });
            choices.forEach(({ id, title, artist }) => {
                menu.addChoice(+id, title, `Artists: ${artist}`);
            });
            const answer = choices.findIndex(({ id }) => this.gallery.id === id);
            if (answer === -1) {
                return this.client.commandHandler.emitError(
                    new Error('Parsing Failed'),
                    message,
                    this
                );
            }
            const embed = this.client.embeds.default().setFooter('Quiz session ended');
            const handler = await menu.run(
                this.client,
                message,
                message, // await message.channel.send('Searching ...'),
                `> **Guess the doujin • [** ${message.author.tag} **]**`,
                {
                    collectorTimeout: 30000,
                    onTimeout: () => {
                        return this.client.embeds
                            .richDisplay({ removeOnly: true, removeRequest: false })
                            .useCustomFooters()
                            .addPage(
                                embed
                                    .setColor('#ffbf00')
                                    .setAuthor('⌛\u2000Timed out')
                                    .setDescription(
                                        `The session timed out as you did not answer within 30 seconds. The correct answer was **${
                                            answer + 1
                                        } [${choices[answer].title}](${choices[answer].url})**.`
                                    )
                            )
                            .run(
                                this.client,
                                message,
                                message, // await message.channel.send('Loading ...')
                                '',
                                {
                                    collectorTimeout: 180000,
                                }
                            );
                    },
                }
            );
            const choice = await handler.selection;
            const done = this.client.embeds
                .richDisplay({ removeOnly: true, removeRequest: false })
                .useCustomFooters();
            if (choice === answer) {
                done.addPage(
                    embed
                        .setColor('#008000')
                        .setAuthor('✅\u2000Correct')
                        .setDescription(
                            `Congratulations! You got it right!\nThe correct answer was **[${
                                answer + 1
                            }] [${choices[answer].title}](${choices[answer].url})**.`
                        )
                ).run(
                    this.client,
                    message,
                    message // await message.channel.send('Loading ...')
                );
            } else {
                done.addPage(
                    embed
                        .setColor('#ff0000')
                        .setAuthor('❌\u2000Wrong Answer')
                        .setDescription(
                            `Unfortunately, that was the wrong answer.\nThe correct answer was **[${
                                answer + 1
                            }] [${choices[answer].title}](${
                                choices[answer].url
                            })**.\nYou chose **[${choice + 1}] [${choices[choice].title}](${
                                choices[choice].url
                            })**.`
                        )
                ).run(
                    this.client,
                    message,
                    message // await message.channel.send('Loading ...')
                );
            }
        } catch (err) {
            this.client.logger.error(err.message);
        }
    }
}
