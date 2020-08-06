import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { Logger } from '@nhentai/utils/logger';
import util from 'util';

export class EvalCommand extends Command {
    constructor() {
        super('eval', {
            aliases: ['eval', 'e'],
            category: 'owner',
            ownerOnly: true,
            args: [{
                id: 'code',
                match: 'content'
            }]
        });
    }

    async exec(message: Message, { code }: { code: string }) {
        if (!code) return message.channel.send('No code provided!');

        let evaled = {
            message: message,
            errored: false,
            output: ''
        };
        let logs: Array<string>;

        const token = this.client.token.split('').join('[^]{0,2}');
        const rev = this.client.token.split('').reverse().join('[^]{0,2}');
        const tokenRegex = new RegExp(`${token}|${rev}`, 'g');
        const cb = '```';

        try {
            let output = eval(code);
            if (output instanceof Promise) output = await output;

            if (typeof output !== 'string') output = util.inspect(output, { depth: 0 });
            output = `${logs.join('\n')}\n${logs.length && output === 'undefined' ? '' : output}`;
            output = output.replace(tokenRegex, '[TOKEN]');

            if (output.length + code.length > 1900) output = 'Output too long.';

            const sent = await message.channel.send([
                `📥\u2000**Input**${cb}js`,
                code,
                cb,
                `📤\u2000**Output**${cb}js`,
                output,
                cb
            ]);

            evaled.message = sent;
            evaled.errored = false;
            evaled.output = output;

            return sent;
        } catch (err) {
            Logger.error('An eval error occured.');
            Logger.stackTrace(err);
            let error = err;

            error = error.toString();
            error = `${logs.join('\n')}\n${logs.length && error === 'undefined' ? '' : error}`;
            error = error.replace(tokenRegex, '[TOKEN]');

            const sent = await message.channel.send([
                `📥\u2000**Input**${cb}js`,
                code,
                cb,
                `☠\u2000**Error**${cb}js`,
                error,
                cb
            ]);

            evaled.message = sent;
            evaled.errored = true;
            evaled.output = error;

            return sent;
        }
    }
};
