module.exports = class Util {

    static base64(text, mode = 'encode') {
		if (mode === 'encode') return Buffer.from(text).toString('base64');
		if (mode === 'decode') return Buffer.from(text, 'base64').toString('utf8') || null;
		throw new TypeError(`${mode} is not a supported base64 mode.`);
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

    static pad(text, width, char = '0') {
        return String(text).length >= width ? String(text) : new Array(width - String(text).length + 1).join(char) + String(text);
    }

    static random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static shorten(text, maxLen = 2000) {
        return (text.substring(0, text.lastIndexOf(' ', maxLen) + 1) + "...");
    }
};