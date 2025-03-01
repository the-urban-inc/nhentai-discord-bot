import { Client } from './Client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { BLOCKED_MESSAGE } from '@constants';

const PROTOCOL_AND_DOMAIN_RE = /^(?:\w+:)?\/\/(\S+)$/;
const LOCALHOST_DOMAIN_RE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
const NON_LOCALHOST_DOMAIN_RE = /^[^\s\.]+\.\S{2,}$/;

export class Util {
    client: Client;
    constructor(client: Client) {
        this.client = client;
    }

    base64(text: string, mode = 'encode') {
        if (mode === 'encode') return Buffer.from(text).toString('base64');
        if (mode === 'decode') return Buffer.from(text, 'base64').toString('utf8') || null;
        throw new TypeError(`${mode} is not a supported base64 mode.`);
    }

    chunkify<T>(a: T[], chunk: number) {
        return Array.from(Array(Math.ceil(a.length / chunk)), (_, i) =>
            a.slice(i * chunk, i * chunk + chunk)
        );
    }

    formatMilliseconds(ms: number) {
        let x = Math.floor(ms / 1000);
        const s = x % 60;

        x = Math.floor(x / 60);
        const m = x % 60;

        x = Math.floor(x / 60);
        const h = x % 24;

        const d = Math.floor(x / 24);

        const seconds = `${'0'.repeat(2 - s.toString().length)}${s}`;
        const minutes = `${'0'.repeat(2 - m.toString().length)}${m}`;
        const hours = `${'0'.repeat(2 - h.toString().length)}${h}`;
        const days = `${'0'.repeat(Math.max(0, 2 - d.toString().length))}${d}`;

        return `${days === '00' ? '' : `${days}:`}${hours}:${minutes}:${seconds}`;
    }

    capitalize(text: string) {
        return text.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
        });
    }

    communityGuidelines() {
        return {
            content: BLOCKED_MESSAGE,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel('Discord Community Guidelines')
                        .setURL('https://discord.com/guidelines')
                        .setStyle(ButtonStyle.Link)
                ),
            ],
            flags: 64, // MessageFlags.Ephemeral,
        };
    }

    compareObject(object1: Object, object2: Object, first = true) {
        const keys1 = Object.keys(object1);
        const keys2 = Object.keys(object2);
        const keys = first ? keys1.filter(key => keys2.includes(key)) : keys1;
        for (const key of keys) {
            const val1 = object1[key];
            const val2 = object2[key];
            const areObjects = this.isObject(val1) && this.isObject(val2);
            if (
                (areObjects && !this.compareObject(val1, val2, false)) ||
                (!areObjects && val1 !== val2)
            ) {
                return false;
            }
        }
        return true;
    }

    escapeMarkdown(text: string) {
        let unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1');
        let escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1');
        return escaped;
    }

    escapeRegExp(text: string) {
        return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }

    /**
     * Shorten a `string[]` to conform to 1024-character limit
     * @param {string[]}} tags
     */
    gshorten(tags: Array<string>, split = ' ', maxLen = 1024) {
        let text = tags.join(split);
        if (text.length <= maxLen) return text;
        return text.substring(0, text.lastIndexOf(split, maxLen - 4) + 1) + '...';
    }

    hasCommon<T>(texts: T[], keywords: T[]) {
        return [...new Set(texts)].some(x => new Set(keywords).has(x));
    }

    /**
     * https://github.com/rigoneri/indefinite-article.js
     * @author: Rodrigo Neri (rigoneri)
     */
    indefiniteArticle(phrase: string) {
        // Getting the first word
        const match = /\w+/.exec(phrase);
        let word = 'an';
        if (match) word = match[0];
        else return word;

        const l_word = word.toLowerCase();
        // Specific start of words that should be preceeded by 'an'
        const alt_cases = ['honest', 'hour', 'hono'];
        for (const i in alt_cases) {
            if (l_word.indexOf(alt_cases[i]) === 0) return 'an';
        }

        // Single letter word which should be preceeded by 'an'
        if (l_word.length === 1) {
            if ('aedhilmnorsx'.indexOf(l_word) >= 0) return 'an';
            else return 'a';
        }

        // Capital words which should likely be preceeded by 'an'
        if (
            word.match(
                /(?!FJO|[HLMNS]Y.|RY[EO]|SQU|(F[LR]?|[HL]|MN?|N|RH?|S[CHKLMNPTVW]?|X(YL)?)[AEIOU])[FHLMNRSX][A-Z]/
            )
        ) {
            return 'an';
        }

        // Special cases where a word that begins with a vowel should be preceeded by 'a'
        const regexes = [/^e[uw]/, /^onc?e\b/, /^uni([^nmd]|mo)/, /^u[bcfhjkqrst][aeiou]/];
        for (const i in regexes) {
            if (l_word.match(regexes[i])) return 'a';
        }

        // Special capital words (UK, UN)
        if (word.match(/^U[NK][AIEO]/)) {
            return 'a';
        } else if (word === word.toUpperCase()) {
            if ('aedhilmnorsx'.indexOf(l_word[0]) >= 0) return 'an';
            else return 'a';
        }

        // Basic method of words that begin with a vowel being preceeded by 'an'
        if ('aeiou'.indexOf(l_word[0]) >= 0) return 'an';

        // Instances where y follwed by specific letters is preceeded by 'an'
        if (l_word.match(/^y(b[lor]|cl[ea]|fere|gg|p[ios]|rou|tt)/)) return 'an';

        return 'a';
    }

    isBetween(num: number, min: number, max: number) {
        return num >= min && num <= max;
    }

    isObject(object: any) {
        return object != null && typeof object === 'object';
    }

    isUrl(s: string) {
        if (typeof s !== 'string') return false;
        const match = s.match(PROTOCOL_AND_DOMAIN_RE);
        if (!match) return false;
        const everythingAfterProtocol = match[1];
        if (!everythingAfterProtocol) return false;
        if (
            LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol) ||
            NON_LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol)
        )
            return true;
        return false;
    }

    pad(text: string, width: number, char = '0') {
        return String(text).length >= width
            ? String(text)
            : new Array(width - String(text).length + 1).join(char) + String(text);
    }

    random<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    shorten(text: string, split = ' ', maxLen = 4090) {
        if (text.length <= maxLen) return text;
        return text.substring(0, text.lastIndexOf(split, maxLen) + 1) + '`...`';
    }

    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    splitWithQuotes(text: string) {
        return text.match(/\\?.|^$/g).reduce(
            (p, c) => {
                if (c === '"') {
                    p.quote ^= 1;
                } else if (!p.quote && c === ' ') {
                    p.a.push('');
                } else {
                    p.a[p.a.length - 1] += c.replace(/\\(.)/, '$1');
                }
                return p;
            },
            { a: [''], quote: 0 }
        ).a;
    }

    resolvePerm(text: string) {
        return text
            .toLowerCase()
            .replace(/guild/g, 'Server')
            .replace(/_/g, ' ')
            .replace(/\b[a-z]/g, t => t.toUpperCase());
    }
}
