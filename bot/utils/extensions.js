module.exports = class Util {

    static base64(text, mode = 'encode') {
		if (mode === 'encode') return Buffer.from(text).toString('base64');
		if (mode === 'decode') return Buffer.from(text, 'base64').toString('utf8') || null;
		throw new TypeError(`${mode} is not a supported base64 mode.`);
    }

    static calculateLevel(exp) {
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
            100000
        ]
        const expRequiredForNextLevel = playerEXPLevel.reduce((a, x, i) => [...a, x + (a[i - 1] || 0)], []);
        const findPos = (a, x) => { for (let i = 0; i < a.length; i++) if (a[i] > x) return i; };
        const pos = findPos(expRequiredForNextLevel, exp);
        return [pos + 1, expRequiredForNextLevel[pos]];
    }

    static capitalize(text) {
        return text.replace(/([^\W_]+[^\s-]*) */g, function (txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    static escapeMarkdown(text) {
        let unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1');
        let escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1');
        return escaped;
    }
    
    static escapeRegExp(text) {
        return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"); 
    }

    /**
     * Shorten a `string[]` to conform to 1024-character limit
     * @param {string[]}} tags 
     */
    static gshorten(tags) {
        let res = '';
        for (const tag of tags) res += (res.length + tag.length + 1 <= 1020 ? tag + ' ' : '');
        return (res + (tags.join(' ').length > 1024 ? '...' : ''));
    }

    static pad(text, width, char = '0') {
        return String(text).length >= width ? String(text) : new Array(width - String(text).length + 1).join(char) + String(text);
    }

    static random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static shorten(text, split = ' ', maxLen = 2000) {
        if (text.length <= maxLen) return text;
        return (text.substring(0, text.lastIndexOf(split, maxLen) + 1) + '`...`');
    }
};