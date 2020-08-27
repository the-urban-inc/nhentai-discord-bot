import { AkairoClient, ClientUtil } from 'discord-akairo';

export class NhentaiUtil extends ClientUtil {
    constructor(client: AkairoClient) {
        super(client);
    }

    base64(text: string, mode = 'encode') {
        if (mode === 'encode') return Buffer.from(text).toString('base64');
        if (mode === 'decode') return Buffer.from(text, 'base64').toString('utf8') || null;
        throw new TypeError(`${mode} is not a supported base64 mode.`);
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

    calculateLevel(exp: number) {
        const playerEXPLevel = [
            500,
            800,
            1240,
            1320,
            1400,
            1480,
            1560,
            1640,
            1720,
            1800,
            1880,
            1960,
            2040,
            2120,
            2200,
            2280,
            2360,
            2440,
            2520,
            2600,
            2680,
            2760,
            2840,
            2920,
            3000,
            3080,
            3160,
            3240,
            3350,
            3460,
            3570,
            3680,
            3790,
            3900,
            4200,
            4500,
            4800,
            5100,
            5400,
            5700,
            6000,
            6300,
            6600,
            6900,
            7200,
            7500,
            7800,
            8100,
            8400,
            8700,
            9000,
            9500,
            10000,
            10500,
            11000,
            11500,
            12000,
            12500,
            13000,
            13500,
            14000,
            14500,
            15000,
            15500,
            16000,
            17000,
            18000,
            19000,
            20000,
            21000,
            22000,
            23000,
            24000,
            25000,
            26000,
            27000,
            28000,
            29000,
            30000,
            31000,
            32000,
            33000,
            34000,
            35000,
            36000,
            37000,
            38000,
            39000,
            40000,
            41000,
            42000,
            43000,
            44000,
            45000,
            46000,
            47000,
            48000,
            49000,
            50000,
            51000,
            52000,
            54000,
            56000,
            58000,
            60000,
            62000,
            64000,
            66000,
            68000,
            70000,
            73000,
            76000,
            79000,
            82000,
            85000,
            88000,
            91000,
            94000,
            97000,
            100000,
        ];
        const expRequiredForNextLevel = playerEXPLevel.reduce(
            (a, x, i) => [...a, x + (a[i - 1] || 0)],
            []
        );
        const findPos = (a: Array<number>, x: number) => {
            for (let i = 0; i < a.length; i++) if (a[i] > x) return i;
        };
        const pos = findPos(expRequiredForNextLevel, exp);
        return [pos + 1, expRequiredForNextLevel[pos]];
    }

    capitalize(text: string) {
        return text.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
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
    gshorten(tags: Array<string>) {
        let res = '';
        for (const tag of tags) res += res.length + tag.length + 1 <= 1020 ? tag + ' ' : '';
        return res + (tags.join(' ').length > 1024 ? '...' : '');
    }

    pad(text: string, width: number, char = '0') {
        return String(text).length >= width
            ? String(text)
            : new Array(width - String(text).length + 1).join(char) + String(text);
    }

    random(array: Array<any>) {
        return array[Math.floor(Math.random() * array.length)];
    }

    shorten(text: string, split = ' ', maxLen = 2000) {
        if (text.length <= maxLen) return text;
        return text.substring(0, text.lastIndexOf(split, maxLen) + 1) + '`...`';
    }

    toTitleCase(text: string) {
        return text
            .toLowerCase()
            .replace(/guild/g, 'Server')
            .replace(/_/g, ' ')
            .replace(/\b[a-z]/g, t => t.toUpperCase());
    }
}
