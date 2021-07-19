import { Client, Command } from '@structures';
import { CommandInteraction } from 'discord.js';
import util from 'util';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'eval',
            description: 'Evaluates a code block',
            owner: true,
            options: [
                {
                    name: 'code',
                    type: 'STRING',
                    description: 'The code to evaluate',
                    required: true
                },
            ],
        });
    }

    async exec(interaction: CommandInteraction) {
        const code = interaction.options.get('code').value as string;
        const logs = [''];
        const token = this.client.token!.split('').join('[^]{0,2}');
        const rev = this.client.token!.split('').reverse().join('[^]{0,2}');
        const tokenRegex = new RegExp(`${token}|${rev}`, 'g');
        const cb = '```';

        try {
            let output = eval(code);
            if (output instanceof Promise) output = await output;

            if (typeof output !== 'string') output = util.inspect(output, { depth: 0 });
            output = `${logs.join('\n')}\n${
                logs.length && output === 'undefined' ? '' : output
            }`.replace(tokenRegex, '[TOKEN]');

            if (output.length + code.length > 1900) output = 'Output too long.';

            return await interaction.editReply(
                `📥\u2000**Input**${cb}js\n` +
                    code +
                    cb +
                    `\n📤\u2000**Output**${cb}js\n` +
                    output +
                    cb
            );
        } catch (err) {
            this.client.logger.error('An eval error occured.');
            this.client.logger.stackTrace(err);
            let error = err.toString();
            error = `${logs.join('\n')}\n${
                logs.length && error === 'undefined' ? '' : error
            }`.replace(tokenRegex, '[TOKEN]');

            return await interaction.editReply(
                `📥\u2000**Input**${cb}js\n` +
                    code +
                    cb +
                    `\n☠\u2000**Error**${cb}js\n` +
                    error +
                    cb
            );
        }
    }
}
