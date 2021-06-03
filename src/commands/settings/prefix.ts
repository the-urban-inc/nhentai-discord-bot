import { Command } from '@structures';
import { Message } from 'discord.js';
import config from '@config';

const MAX_LEN = 100;
const REQUIRED_PERMISSIONS = ['MANAGE_GUILD'] as const;
const PREFIX = config.settings.prefix.nsfw[0];
const PREFIXES = config.settings.prefix.sfw.join(', ');

const ACTIONS = {
    add: 'Added',
    remove: 'Removed',
    clear: 'Cleared',
    list: 'List',
};

export default class extends Command {
    constructor() {
        super('prefix', {
            aliases: ['prefix'],
            channel: 'guild',
            userPermissions: REQUIRED_PERMISSIONS,
            description: {
                content: "Edits server's custom prefix list.",
                usage: '<nsfw|sfw> <add <prefix>|remove <prefix>|clear|list>',
                examples: [
                    ' nsfw add lmao\nAdds `lmao` as a NSFW prefix.',
                    " sfw remove lol\nRemoves `lol` from SFW prefix list (does nothing if `lol` doesn't exist)",
                    ` nsfw remove ${PREFIX}\nDoes nothing.`,
                    ` sfw clear\nClears out the SFW prefix list (does not clear the default prefix(es) (${PREFIXES}))`,
                    ' nsfw list\nShows the NSFW prefix list.',
                ],
                additionalInfo: `Prefix length must be between 1 and ${MAX_LEN}.`,
            },
            error: {
                'Invalid Query': {
                    message: 'Please provide valid arguments!',
                    example: ' nsfw add lmao\nto add `lmao` as a NSFW prefix',
                },
            },
            args: [
                {
                    id: 'nsfw',
                    type: ['nsfw', 'sfw'],
                },
                {
                    id: 'action',
                    type: Object.keys(ACTIONS),
                },
                {
                    id: 'prefix',
                    match: 'rest',
                },
            ],
        });
    }

    async exec(
        message: Message,
        {
            nsfw,
            action,
            prefix,
        }: { nsfw: 'nsfw' | 'sfw'; action: keyof typeof ACTIONS; prefix: string }
    ) {
        if (!nsfw) {
            return this.client.commandHandler.emitError(new Error('Invalid Query'), message, this);
        }
        if (!action) {
            return this.client.commandHandler.emitError(new Error('Invalid Query'), message, this);
        }
        if ((!prefix || prefix.length > MAX_LEN) && action !== 'list' && action !== 'clear') {
            return this.client.commandHandler.emitError(new Error('Invalid Query'), message, this);
        }
        try {
            const prefixes = await this.client.db.Server.prefix(message, nsfw, action, prefix);
            if (action === 'add' || action === 'remove') {
                await this.client.commandHandler.updatePrefix(message);
                return message.channel.send(
                    this.client.embeds.info(`${ACTIONS[action]} prefix \`${prefix}\`.`)
                );
            } else if (action === 'clear') {
                await this.client.commandHandler.updatePrefix(message);
                return message.channel.send(this.client.embeds.info('Cleared all prefixes.'));
            } else if (!prefixes.length) {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setTitle('Custom Prefix List')
                        .setDescription(
                            'This server has no custom prefixes. Ask someone with `Manage Server` permission to add one.'
                        )
                );
            }
            const list = this.client.embeds.richMenu({
                template: this.client.embeds
                    .default()
                    .setTitle('Custom Prefix List')
                    .setDescription(
                        `You can still use the default prefix ${this.client.config.settings.prefix[nsfw]}.`
                    ),
                list: 5,
            });
            for (const pfx of prefixes) {
                const user = await this.client.users.fetch(pfx.author);
                list.addChoice(
                    0,
                    pfx.id,
                    `**Added by** : ${user.tag}\u2000•\u2000**Date added** : ${new Date(
                        pfx.date
                    ).toUTCString()}`
                );
            }
            return list.run(
                this.client,
                message,
                message, // await message.channel.send('Fetching list...')
                '',
                {
                    collectorTimeout: 180000,
                }
            );
        } catch (err) {
            this.client.logger.error(err);
        }
    }
}
