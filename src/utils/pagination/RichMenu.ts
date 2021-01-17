/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/RichMenu.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import { Message } from 'discord.js';
import { Cache } from './Cache';
import { ReactionMethods, ReactionHandler, ReactionHandlerOptions } from './ReactionHandler';
import { RichDisplay, RichDisplayOptions } from './RichDisplay';
import { Client } from '@structures';

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
    options: RichDisplayOptions;

    constructor(options: RichDisplayOptions = {}) {
        super(options);
        this.options = options;
        if (options.list ?? false) {
            this._emojis.delete(ReactionMethods.Love);
        } else {
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
    }

    addPage(): never {
        throw new Error('You cannot directly add pages in a RichMenu');
    }

    addChoice(id: number, name: string, body: string, inline = false): this {
        this.choices.push({ id, name, body, inline });
        return this;
    }

    async run(
        client: Client,
        requestMessage: Message,
        message: Message,
        editMessage: string = '',
        options: ReactionHandlerOptions = {}
    ): Promise<ReactionHandler> {
        if (this.choices.length < choiceMethods.length) {
            for (let i = this.choices.length; i < choiceMethods.length; i++)
                this._emojis.delete(choiceMethods[i]);
        }
        if (!this.paginated) this.paginate();
        return super.run(client, requestMessage, message, editMessage, options);
    }

    private paginate(): null {
        const page = this.pages.length, l = this.options.list ?? 5;
        if (this.paginated) return null;
        super.addPage(embed => {
            for (
                let i = 0, choice = this.choices[i + page * l];
                i + page * l < this.choices.length && i < l;
                i++, choice = this.choices[i + page * l]
            ) {
                embed.addField(
                    `[${this.options.list ?? false ? i + page * l + 1 : i + 1}] ${choice.name}`,
                    choice.body,
                    choice.inline
                );
            }
            return embed;
        });
        if (this.choices.length > (page + 1) * l) return this.paginate();
        this.paginated = true;
        return null;
    }
}
