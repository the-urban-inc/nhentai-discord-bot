import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('info', {
            aliases: ['info', 'information'],
            nsfw: true,
            description: {
                content: 'Shows nhentai info page.',
                examples: ['\nLiterally shows nhentai info page.'],
            },
        });
    }

    exec(message: Message) {
        return message.channel.send(
            this.client.embeds
                .default()
                .addField(
                    'Features',
                    '• No, we are not going to add a forum, ever. Fuck forums.\n' +
                        "• You'll be able to upload and edit galleries soon."
                )
                .addField(
                    'Accounts',
                    '• Unlimited favorites.\n' +
                        '• Tag blacklisting.\n' +
                        '• Three gorgeous themes: light, blue, and black.'
                )
                .addField(
                    'Search',
                    '• You can search for multiple terms at the same time, and this will return only galleries that contain both terms. For example, `anal tanlines` finds all galleries that contain both `anal` and `tanlines`.\n' +
                        '• You can exclude terms by prefixing them with `-`. For example, `anal tanlines -yaoi` matches all galleries matching `anal` and `tanlines` but not `yaoi`.\n' +
                        '• Exact searches can be performed by wrapping terms in double quotes. For example, `"big breasts"` only matches galleries with "big breasts" somewhere in the title or in tags.\n' +
                        '• These can be combined with tag namespaces for finer control over the query: `parodies:railgun -tag:"big breasts"`.\n' +
                        '• You can search for galleries with a specific number of pages with `pages:20`, or with a page range: `pages:>20 pages:<=30`.\n' +
                        '• You can search for galleries uploaded within some timeframe with `uploaded:20d`. Valid units are `h`, `d`, `w`, `m`, `y`. You can use ranges as well: `uploaded:>20d uploaded:<30d`.'
                )
                .addField(
                    'Want to get in touch?',
                    '• Email: `hey@nhentai.net` (if you have a technical problem, include your operating system and browser info, with version numbers)\n' +
                        '• Abuse: `abuse@nhentai.net`\n' +
                        '• Twitter: `@nhentaiOfficial`\n' +
                        '• Blog: `blog.nhentai.net`'
                )
                .addField('‎', 'Thanks for supporting the site!\n' + '❤️ Love,\n' + '–Team nhentai')
                .setFooter(`For bot info, use ${this.client.config.settings.prefix.nsfw[0]}about`)
        );
    }
}
