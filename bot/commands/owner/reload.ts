import { Command, CommandHandler, InhibitorHandler, ListenerHandler, Category } from 'discord-akairo';
import { Message } from 'discord.js';
import { NhentaiClient } from '@nhentai/struct/Client';

export class ReloadCommand extends Command {
    constructor() {
        super('reload', {
            aliases: ['reload', 'r'],
            category: 'owner',
            ownerOnly: true,
            args: [{
                id: 'category',
                default: 'general'
            }, {
                id: 'type',
                type: [
                    ['command', 'cmd', 'c'], 
                    ['inhibitor', 'inhib', 'inh', 'i'], 
                    ['listener', 'lis', 'l']
                ],
                default: 'command'
            }]
        });
    }

    exec(message: Message, { category, type }: { category: string, type: string }) {
        const handlers = {
            'command': [(this.client as NhentaiClient).commandHandler, 'commands'],
            'inhibitor': [(this.client as NhentaiClient).inhibitorHandler, 'inhibitors'],
            'listener': [(this.client as NhentaiClient).listenerHandler, 'listeners']
        };

        const [handler, name] = handlers[type as keyof typeof handlers] as [CommandHandler | InhibitorHandler | ListenerHandler, string];
        const nhentaiCategory = handler.findCategory(category) // || handler.categories.find((c) => c.id.startsWith(category));

        nhentaiCategory.reloadAll();
        return message.channel.send(`Reloaded ${nhentaiCategory.id} ${name}.`);
    }
};
