import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import he from 'he';
import { FLAG_EMOJIS } from '@nhentai/utils/constants';

export default class extends Command {
    constructor() {
        super('home', {
            aliases: ['home', 'homepage'],
            channel: 'guild',
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

    async exec(message: Message, { page }: { page: string }) {
        try {
            let pageNum = parseInt(page, 10);
            const data = await this.client.nhentai.homepage(pageNum);

            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > data.num_pages)
                return message.channel.send(
                    this.client.embeds.clientError(
                        'Page number is not an integer or is out of range.'
                    )
                );

            if (pageNum === 1) {
                const popularNow = data.results.slice(0, 5);
                const displayPopular = this.client.embeds.richDisplay({ info: true }).useCustomFooters();
                for (const [idx, doujin] of popularNow.entries()) {
                    displayPopular.addPage(
                        this.client.util
                            .embed()
                            .setTitle(`${he.decode(doujin.title)}`)
                            .setURL(`https://nhentai.net/g/${doujin.id}`)
                            .setDescription(
                                `**ID** : ${doujin.id}\u2000•\u2000**Language** : ${
                                    FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] ||
                                    'N/A'
                                }`
                            )
                            .setImage(doujin.thumbnail.s)
                            .setFooter(
                                `Doujin ${idx + 1} of ${
                                    popularNow.length
                                }\u2000•\u2000Page ${page} of ${data.num_pages || 1}`
                            )
                            .setTimestamp(),
                        doujin.id
                    );
                }
                await displayPopular.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '`🔥` **Popular Now**'
                );

                const newUploads = data.results.slice(5);
                const displayNew = this.client.embeds.richDisplay({ info: true }).useCustomFooters();
                for (const [idx, doujin] of newUploads.entries()) {
                    displayNew.addPage(
                        this.client.util
                            .embed()
                            .setTitle(`${he.decode(doujin.title)}`)
                            .setURL(`https://nhentai.net/g/${doujin.id}`)
                            .setDescription(
                                `**ID** : ${doujin.id}\u2000•\u2000**Language** : ${
                                    FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] ||
                                    'N/A'
                                }`
                            )
                            .setImage(doujin.thumbnail.s)
                            .setFooter(
                                `Doujin ${idx + 1} of ${newUploads.length} • Page ${page} of ${
                                    data.num_pages || 1
                                }`
                            )
                            .setTimestamp(),
                        doujin.id
                    );
                }
                return displayNew.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '`🧻` **New Uploads**'
                );
            }

            const display = this.client.embeds.richDisplay({ info: true }).useCustomFooters();
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(
                    this.client.util
                        .embed()
                        .setTitle(`${he.decode(doujin.title)}`)
                        .setURL(`https://nhentai.net/g/${doujin.id}`)
                        .setDescription(
                            `**ID** : ${doujin.id}\u2000•\u2000**Language** : ${
                                FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] || 'N/A'
                            }`
                        )
                        .setImage(doujin.thumbnail.s)
                        .setFooter(
                            `Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${
                                data.num_pages || 1
                            }`
                        )
                        .setTimestamp(),
                    doujin.id
                );
            }
            return display.run(this.client, message, await message.channel.send('Searching ...'));
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
