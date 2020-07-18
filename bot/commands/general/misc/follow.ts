import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

const cat = [ 'tag', 'artist', 'character', 'parody', 'group', 'language' ];

export class FollowCommand extends Command {
    constructor() {
        super('follow', {
            category: 'general',
            aliases: ['follow'],
            description: {
                content: 'Follow a tag & get notified over DM when something new gets published.',
                usage: '[type] [tag]',
                examples: ['tag story arc', 'language english']
            },
            args: [{
                id: 'type',
                type: 'string',
                match: 'phrase',
                description: 'Tag type'
            }, {
                id: 'tag',
                type: 'string',
                match: 'rest',
                description: 'Tag to follow'
            }],
            cooldown: 3000
        })
    }

    async exec(m: Message, { tag, type } : { tag: string, type: string }) {
        if (!tag)
            return m.channel.send(
                (this.client as any).embeds('error', 'No tag was given.')
            )
        if (!cat.includes(type))
            return m.channel.send(
                (this.client as any).embeds('error', 'Invalid tag type.')
            )
        // resolve tags
        let _ = null;
        try {
            _ = await (this.client as any).nhentai[type](tag);
            // for some damn reason the code doesn't throw
            if (!_) throw '';
        } catch {
            return m.channel.send(
                (this.client as any).embeds(
                    'error',
                    'Error loading tag. Please, confirm whether the tag really exists.'
                )
            )
        };

        // dispatch event to subprocess
        (this.client as any).notifier.send({ tag: _.tagId, userId: m.author.id });
        m.channel.send(
            (this.client as any).embeds(
                'info',
                `✅ You are now registered for updates.\n**Tag**: \`${tag}\` (${
                    _.tagId
                }) | **Type**: \`${type}\`\nIt may take a while before you start receiving updates.`
            )
        )
    }
}
