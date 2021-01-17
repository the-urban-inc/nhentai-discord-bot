/**
 * Inspired by https://github.com/1Computer1/kaado/blob/master/src/util/Logger.js
 * @author: 1Computer (1Computer1)
 */

import chalk from 'chalk';
import moment from 'moment';
import util from 'util';

enum Color {
    RED = 'red',
    YELLOW = 'yellow',
    GREEN = 'green',
    WHITE = 'white',
    GREY = 'grey',
}

export class Logger {
    log(...args: any) {
        const text = this.prepareText(args);
        this.writeToConsole(text, {
            color: Color.GREY,
            tag: 'Log',
        });
    }

    info(...args: any) {
        const text = this.prepareText(args);
        this.writeToConsole(text, {
            color: Color.GREEN,
            tag: 'Info',
        });
    }

    warn(...args: any) {
        const text = this.prepareText(args);
        this.writeToConsole(text, {
            color: Color.YELLOW,
            tag: 'Warn',
        });
    }

    error(...args: any) {
        const text = this.prepareText(args);
        this.writeToConsole(text, {
            color: Color.RED,
            tag: 'Error',
            error: true,
        });
    }

    stackTrace(...args: any) {
        const text = this.prepareText(args);
        this.writeToConsole(text, {
            color: Color.WHITE,
            tag: 'Error',
            error: true,
        });
    }

    writeToConsole(content: string, options: { color: Color; tag: string; error?: boolean }) {
        const { color = Color.GREY, tag = 'Log', error = false } = options;
        const timestamp = chalk.cyan(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]:`);
        const levelTag = chalk.bold(`[${tag}]:`);
        const text = chalk[color](content);
        const std = error ? process.stderr : process.stdout;
        std.write(`${timestamp} ${levelTag} ${text}\n`);
    }

    clean(item: any) {
        if (typeof item === 'string') return item;
        const cleaned = util.inspect(item, { depth: Infinity });
        return cleaned;
    }

    prepareText(args: any) {
        const cleanedArgs = [];
        for (const arg of args) {
            cleanedArgs.push(this.clean(arg));
        }
        return cleanedArgs.join(' ');
    }
}
