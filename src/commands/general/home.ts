import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import he from 'he';
import { Server } from '@inari/models/server';
import { FLAG_EMOJIS, BANNED_TAGS, BLOCKED_MESSAGE } from '@inari/utils/constants';

export default class extends Command {
    constructor() {
        super('home', {
            aliases: ['home', 'homepage'],
            channel: 'guild',
            nsfw: true,
            description: {
                content: 'nhentai homepage.',
                usage: '[--page=pagenum]',
                examples: ['', '-p=3'],
            },
            args: [
                {
                    id: 'page',
                    match: 'option',
                    flag: ['--page=', '-p='],
                    default: '1',
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
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    async exec(message: Message, { page, dontLogErr }: { page: string; dontLogErr?: boolean }) {
        try {
            let pageNum = parseInt(page, 10);
            const data = await this.client.nhentai.homepage(pageNum);

            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > data.num_pages)
                throw new RangeError('Page number is not an integer or is out of range.');

            if (pageNum === 1) {
                const popularNow = data.results.slice(0, 5);
                const displayPopular = this.client.embeds
                    .richDisplay({ info: true, download: true, removeRequest: false })
                    .useCustomFooters();
                for (const [
                    idx,
                    { title, id, language, dataTags, thumbnail },
                ] of popularNow.entries()) {
                    const epage = this.client.util
                        .embed()
                        .setTitle(`${he.decode(title)}`)
                        .setURL(`https://nhentai.net/g/${id}`)
                        .setDescription(
                            `**ID** : ${id}\u2000•\u2000**Language** : ${
                                FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'
                            }`
                        )
                        .setFooter(
                            `Doujin ${idx + 1} of ${
                                popularNow.length
                            }\u2000•\u2000Page ${page} of ${data.num_pages || 1}`
                        )
                        .setTimestamp();
                    const prip = this.client.util.hasCommon(dataTags, BANNED_TAGS);
                    if (prip) this.warning = true;
                    if (this.danger || !prip) epage.setImage(thumbnail.s);
                    displayPopular.addPage(epage, id);
                }
                await displayPopular.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '`🔥` **Popular Now**',
                    {
                        idle: 300000,
                        danger: this.danger,
                    }
                );

                const newUploads = data.results.slice(5);
                const displayNew = this.client.embeds
                    .richDisplay({ info: true, download: true, removeRequest: false })
                    .useCustomFooters();
                for (const [
                    idx,
                    { title, id, language, dataTags, thumbnail },
                ] of newUploads.entries()) {
                    const epage = this.client.util
                        .embed()
                        .setTitle(`${he.decode(title)}`)
                        .setURL(`https://nhentai.net/g/${id}`)
                        .setDescription(
                            `**ID** : ${id}\u2000•\u2000**Language** : ${
                                FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'
                            }`
                        )
                        .setFooter(
                            `Doujin ${idx + 1} of ${newUploads.length} • Page ${page} of ${
                                data.num_pages || 1
                            }`
                        )
                        .setTimestamp();
                    const prip = this.client.util.hasCommon(dataTags, BANNED_TAGS);
                    if (prip) this.warning = true;
                    if (this.danger || !prip) epage.setImage(thumbnail.s);
                    displayNew.addPage(epage, id);
                }
                return displayNew.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '`🧻` **New Uploads**',
                    {
                        idle: 300000,
                        danger: this.danger,
                    }
                );
            }

            const display = this.client.embeds
                .richDisplay({ info: true, download: true })
                .useCustomFooters();
            for (const [
                idx,
                { title, id, language, dataTags, thumbnail },
            ] of data.results.entries()) {
                const epage = this.client.util
                    .embed()
                    .setTitle(`${he.decode(title)}`)
                    .setURL(`https://nhentai.net/g/${id}`)
                    .setDescription(
                        `**ID** : ${id}\u2000•\u2000**Language** : ${
                            FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'
                        }`
                    )
                    .setFooter(
                        `Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${
                            data.num_pages || 1
                        }`
                    )
                    .setTimestamp();
                const prip = this.client.util.hasCommon(dataTags, BANNED_TAGS);
                if (prip) this.warning = true;
                if (this.danger || !prip) epage.setImage(thumbnail.s);
                display.addPage(epage, id);
            }
            await display.run(
                this.client,
                message,
                await message.channel.send('Searching ...'),
                '',
                {
                    idle: 300000,
                    danger: this.danger,
                }
            );

            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ image: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Loading ...'), '', {
                        time: 300000,
                    });
            }
        } catch (err) {
            if (dontLogErr) return;
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
