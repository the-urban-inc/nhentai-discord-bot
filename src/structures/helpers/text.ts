export function capitalize(text: string) {
    return text.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    });
}

export function escapeMarkdown(text: string) {
    const unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1');
    const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1');
    return escaped;
}

export function escapeRegExp(text: string) {
    return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

/**
 * Shorten a `string[]` to conform to 1024-character limit
 * @param {string[]}} tags
 */
export function gshorten(tags: Array<string>, split = ' ', maxLen = 1024) {
    const text = tags.join(split);
    if (text.length <= maxLen) return text;
    return text.substring(0, text.lastIndexOf(split, maxLen - 4) + 1) + '...';
}

/**
 * https://github.com/rigoneri/indefinite-article.js
 * @author: Rodrigo Neri (rigoneri)
 */
export function indefiniteArticle(phrase: string) {
    // Getting the first word
    const match = phrase.match(/\w+/);
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

export function pad(text: string, width: number, char = '0') {
    return String(text).length >= width
        ? String(text)
        : new Array(width - String(text).length + 1).join(char) + String(text);
}

export function shorten(text: string, split = ' ', maxLen = 4090) {
    if (text.length <= maxLen) return text;
    return text.substring(0, text.lastIndexOf(split, maxLen) + 1) + '`...`';
}

export function splitWithQuotes(text: string) {
    return (text.match(/\\?.|^$/g) ?? []).reduce(
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

export function resolvePerm(text: string) {
    return text
        .toLowerCase()
        .replace(/guild/g, 'Server')
        .replace(/_/g, ' ')
        .replace(/\b[a-z]/g, t => t.toUpperCase());
}
