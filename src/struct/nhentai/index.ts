import getHTML from './src/get';
import * as Parse from './src/parse';
import { Gallery } from './src/struct';
import qs from 'qs';

async function parseDetailsHTML(url: string) {
    const data = await getHTML(url).catch(err => {
        throw err;
    });
    if (!data) throw new Error('No results found.');
    return {
        id: parseInt(data.id[1], 10),
        related: await Parse.details(data.details),
    };
}

async function parseListHTML(url: string) {
    const list = await getHTML(url).catch(err => {
        throw err;
    });
    if (!list) throw new Error('No results found.');
    return Parse.list(list.details);
}

export class nhentaiClient {
    baseURL: string;

    constructor(baseURL = 'https://nhentai.net') {
        this.baseURL = baseURL;
    }

    async g(id: string, more = false) {
        let details = (await getHTML(`${this.baseURL}/api/gallery/${id}`)).details;
        if (more) {
            let related = (await parseDetailsHTML(`${this.baseURL}/g/${id}/`)).related;
            let comments = (await getHTML(`${this.baseURL}/api/gallery/${id}/comments`)).details;
            if (!related || !comments) throw new Error('Scraping failed');
            return new Gallery(details, related, comments);
        }
        if (!details) throw new Error('Scraping failed');
        return new Gallery(details);
    }

    search(keyword: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            q: keyword,
            page,
            sort,
        });
        return parseListHTML(`${this.baseURL}/search/?${query}`);
    }

    homepage(page = 1) {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(`${this.baseURL}/?${query}`);
    }

    async random(more = false) {
        let { id, related } = await parseDetailsHTML(`${this.baseURL}/random/`);
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        let details = (await getHTML(`${this.baseURL}/api/gallery/${id}`)).details;
        if (more) {
            let comments = (await getHTML(`${this.baseURL}/api/gallery/${id}`)).details;
            if (!comments) throw new Error('Scraping failed');
            return new Gallery(details, related, comments);
        }
        if (!details || !related) throw new Error('Scraping failed');
        return new Gallery(details);
    }

    tag(name: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(
            `${this.baseURL}/tag/${name.replace(/ /g, '-')}/${
                sort == 'recent' ? '' : sort
            }?${query}`
        );
    }

    artist(name: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(
            `${this.baseURL}/artist/${name.replace(/ /g, '-')}/${
                sort == 'recent' ? '' : sort
            }?${query}`
        );
    }

    character(name: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(
            `${this.baseURL}/character/${name.replace(/ /g, '-')}/${
                sort == 'recent' ? '' : sort
            }?${query}`
        );
    }

    category(name: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(
            `${this.baseURL}/category/${name.replace(/ /g, '-')}/${
                sort == 'recent' ? '' : sort
            }?${query}`
        );
    }

    parody(name: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(
            `${this.baseURL}/parody/${name.replace(/ /g, '-')}/${
                sort == 'recent' ? '' : sort
            }?${query}`
        );
    }

    group(name: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(
            `${this.baseURL}/group/${name.replace(/ /g, '-')}/${
                sort == 'recent' ? '' : sort
            }?${query}`
        );
    }

    language(name: string, page = 1, sort = 'recent') {
        let query = qs.stringify({
            page,
        });
        return parseListHTML(
            `${this.baseURL}/language/${name.replace(/ /g, '-')}/${
                sort == 'recent' ? '' : sort
            }?${query}`
        );
    }
}
