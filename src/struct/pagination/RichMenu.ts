/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/RichMenu.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import { Message } from 'discord.js';
import { Cache } from './Cache';
import { ReactionMethods, ReactionHandler, ReactionHandlerOptions } from './ReactionHandler';
import { RichDisplay, RichDisplayOptions } from './RichDisplay';
import { NhentaiClient } from '@nhentai/struct/bot/Client';

const choiceMethods = [
    ReactionMethods.One,
    ReactionMethods.Two,
    ReactionMethods.Three,
    ReactionMethods.Four,
    ReactionMethods.Five,
];

export interface Choice {
    id: number;
    name: string;
    body: string;
    inline: boolean;
}

export class RichMenu extends RichDisplay {
    choices: Array<Choice> = [];
    private paginated = false;

    constructor(options: RichDisplayOptions = {}) {
        super(options);

        this._emojis = new Cache([
            [ReactionMethods.First, '⏮'],
            [ReactionMethods.Back, '◀'],
            [ReactionMethods.One, '1️⃣'],
            [ReactionMethods.Two, '2️⃣'],
            [ReactionMethods.Three, '3️⃣'],
            [ReactionMethods.Four, '4️⃣'],
            [ReactionMethods.Five, '5️⃣'],
            [ReactionMethods.Forward, '▶'],
            [ReactionMethods.Last, '⏭'],
            [ReactionMethods.Jump, '↗️'],
            [ReactionMethods.Info, 'ℹ'],
            [ReactionMethods.Remove, '🗑'],
        ]);
    }

    addPage(): never {
        throw new Error('You cannot directly add pages in a RichMenu');
    }

    addChoice(id: number, name: string, body: string, inline = false): this {
        this.choices.push({ id, name, body, inline });
        return this;
    }

    async run(client: NhentaiClient, requestMessage: Message, message: Message, options: ReactionHandlerOptions = {}): Promise<ReactionHandler> {
        if (this.choices.length < choiceMethods.length) {
            for (let i = this.choices.length; i < choiceMethods.length; i++)
                this._emojis.delete(choiceMethods[i]);
        }
        if (!this.paginated) this.paginate();
        return super.run(client, requestMessage, message, options);
    }

    private paginate(): null {
        const page = this.pages.length;
        if (this.paginated) return null;
        super.addPage(embed => {
            for (
                let i = 0, choice = this.choices[i + page * 5];
                i + page * 5 < this.choices.length && i < 5;
                i++, choice = this.choices[i + page * 5]
            ) {
                embed.addField(`[${i + 1}] ${choice.name}`, choice.body, choice.inline);
            }
            return embed;
        });
        if (this.choices.length > (page + 1) * 5) return this.paginate();
        this.paginated = true;
        return null;
    }
}
