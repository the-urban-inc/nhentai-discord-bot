import { Command } from '@structures';
import { CommandHandler, InhibitorHandler, ListenerHandler } from 'discord-akairo';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('reload', {
            aliases: ['reload', 'r'],
            ownerOnly: true,
            args: [
                {
                    id: 'category',
                    default: 'general',
                },
                {
                    id: 'type',
                    type: [
                        ['command', 'cmd', 'c'],
                        ['inhibitor', 'inhib', 'inh', 'i'],
                        ['listener', 'lis', 'l'],
                    ],
                    default: 'command',
                },
            ],
        });
    }

    exec(message: Message, { category, type }: { category: string; type: string }) {
        const handlers = {
            command: [this.client.commandHandler, 'commands'],
            inhibitor: [this.client.inhibitorHandler, 'inhibitors'],
            listener: [this.client.listenerHandler, 'listeners'],
        };

        const [handler, name] = handlers[type as keyof typeof handlers] as [
            CommandHandler | InhibitorHandler | ListenerHandler,
            string
        ];
        const nhentaiCategory = handler.findCategory(category); // || handler.categories.find((c) => c.id.startsWith(category));

        nhentaiCategory.reloadAll();
        return message.channel.send(`Reloaded ${nhentaiCategory.id} ${name}.`);
    }
}
