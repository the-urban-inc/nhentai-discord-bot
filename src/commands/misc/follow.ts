import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import { TAGS } from '@nhentai/utils/constants';

export default class extends Command {
    constructor() {
        super('follow', {
            aliases: ['follow'],
            description: {
                content: 'Follow a tag & get notified over DM when something new gets published.',
                usage: '[type] [tag]',
                examples: ['tag story arc', 'language english'],
            },
            args: [
                {
                    id: 'type',
                    type: 'string',
                    match: 'phrase',
                    description: 'Tag type',
                },
                {
                    id: 'tag',
                    type: 'string',
                    match: 'rest',
                    description: 'Tag to follow',
                },
            ],
        });
    }

    async exec(message: Message, { tag, type }: { tag: string; type: typeof TAGS[number] }) {
        if (!tag)
            return message.channel.send(this.client.embeds.clientError('No tag was specified.'));
        if (!TAGS.includes(type))
            return message.channel.send(
                this.client.embeds.clientError(
                    `Invalid tag type provided. Available types are: ${TAGS.map(
                        s => `\`${s}\``
                    ).join(', ')}.`
                )
            );
        // resolve tags
        let _ = null;
        try {
            _ = await this.client.nhentai[type](tag);
            // for some damn reason the code doesn't throw
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }

        // dispatch event to subprocess
        this.client.notifier.send({ tag: _.tagId, userId: message.author.id });
        message.channel.send(
            this.client.embeds.info(
                `✅ You are now registered for updates.\n**${this.client.util.capitalize(
                    type
                )}**: \`${tag}\` (${
                    _.tagId
                })\nIt may take a while before you start receiving updates.`
            )
        );
    }
}
