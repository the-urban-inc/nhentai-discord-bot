import { Command } from '@structures';
import { Message } from 'discord.js';
import { URL } from 'url';
import { Server } from '@models/server';

export default class extends Command {
    constructor() {
        super('from-url', {
            nsfw: true,
            isConditionalorRegexCommand: true,
        });
    }

    url = false;

    async before(message: Message) {
        try {
            let server = await Server.findOne({ serverID: message.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    settings: { url: false },
                }).save();
            }
            this.url = server.settings.url;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    condition(message: Message) {
        try {
            if (
                !message.content ||
                message.content === '' ||
                message.content === '.' ||
                message.content.startsWith('?')
            )
                return false;
            const url = new URL(
                `${message.content.startsWith('nhentai.net') ? 'https://' : ''}${message.content}`,
                'https://nhentai.net'
            );
            return [
                '/',
                '/g/',
                '/random/',
                '/search/',
                '/tag/',
                '/artist/',
                '/character/',
                '/group/',
                '/parody/',
                '/language/',
                '/info/',
            ].some(path => (path === '/' ? url.pathname === path : url.pathname.startsWith(path)));
        } catch (err) {
            return false;
        }
    }

    async exec(message: Message) {
        if (!this.url) return;
        const url = new URL(
            `${message.content.startsWith('nhentai.net') ? 'https://' : ''}${message.content}`,
            'https://nhentai.net'
        );
        const path = url.pathname.split('/');
        let pageNum = 1;
        if (url.searchParams.has('page')) pageNum = parseInt(url.searchParams.get('page'), 10);
        if (url.pathname.startsWith('/')) path.shift();
        if (!isNaN(parseInt(path[path.length - 1], 10)) && path.length > 2) {
            pageNum = parseInt(path.splice(path.length - 1)[0], 10);
        }
        let sort = 'recent';
        if (url.searchParams.has('sort')) sort = url.searchParams.get('sort');
        if (
            ['recent', 'popular', 'popular-today', 'popular-week'].includes(path[path.length - 1])
        ) {
            sort = path.splice(path.length - 1)[0];
        }
        let q = '';
        if (url.searchParams.has('q')) q = url.searchParams.get('q').split('+').join(' ');
        if (q !== '') path.push(q);
        const cmd = path[0],
            page = pageNum.toString(),
            dontLogErr = true;
        if (cmd === '') {
            const command = this.client.commandHandler.findCommand('home');
            await command.before(message);
            await command.exec(message, { page, dontLogErr });
        } else if (cmd === 'g') {
            const command = this.client.commandHandler.findCommand('g');
            await command.before(message);
            await command.exec(message, { code: path[1], page, dontLogErr });
        } else if (cmd === 'random') {
            const command = this.client.commandHandler.findCommand('random');
            await command.before(message);
            await command.exec(message, { dontLogErr });
        } else if (cmd === 'search') {
            const command = this.client.commandHandler.findCommand('search');
            await command.before(message);
            await command.exec(message, { text: q, page, sort, dontLogErr });
        } else if (cmd === 'info') {
            const command = this.client.commandHandler.findCommand('info');
            await command.exec(message, {});
        } else {
            message.util.parsed.alias = cmd;
            const command = this.client.commandHandler.findCommand(cmd);
            await command.before(message);
            await command.exec(message, { text: path[1], page, sort, dontLogErr });
        }
    }
}
