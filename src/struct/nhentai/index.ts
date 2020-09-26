import getHTML from './src/get';
import * as Parse from './src/parse';
import * as NH from './src/struct';
import qs from 'qs';

async function getRandomID(url: string) {
    const res = await getHTML(url).catch(err => {
        throw err;
    });
    if (!res || !res.data) throw new Error('No results found.');
    return +res.request.res.responseUrl.match(
        /(?:(?:https?:\/\/)?nhentai\.net\/g\/)?([0-9]{1,6})/i
    )[1];
}

async function parseRelatedHTML(url: string) {
    const res = await getHTML(url).catch(err => {
        throw err;
    });
    if (!res || !res.data) throw new Error('No results found.');
    return await Parse.related(res.data);
}

async function parseListHTML(url: string) {
    const res = await getHTML(url).catch(err => {
        throw err;
    });
    if (!res || !res.data) throw new Error('No results found.');
    return await Parse.list(res.data);
}

export class nhentaiClient {
    baseURL: string;

    constructor(baseURL = 'https://nhentai.net') {
        this.baseURL = baseURL;
    }

    async g(id: string, more = false) {
        let details = (await getHTML(`${this.baseURL}/api/gallery/${id}`)).data as NH.Details;
        if (more) {
            let related = await parseRelatedHTML(`${this.baseURL}/g/${id}/`);
            let comments = (await getHTML(`${this.baseURL}/api/gallery/${id}/comments`))
                .data as NH.Comment[];
            if (!related || !comments) throw new Error('Scraping failed');
            return new NH.Gallery(details, related, comments);
        }
        if (!details) throw new Error('Scraping failed');
        return new NH.Gallery(details);
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
        let id = await getRandomID(`${this.baseURL}/random/`);
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return this.g(id.toString(), more);
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
