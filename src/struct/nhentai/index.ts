import getHTML from './src/get';
import * as Parse from './src/parse';
import { Gallery } from './src/gallery';
import qs from 'qs';

async function parseDetailsHTML(url: string) {
	const data = await getHTML(url).catch(err => {
		if (err.response.status == 404) throw new Error('Doujin Not Found');
		else throw err;
	});
	if (!data) throw new Error('No results found.');
	return { 
		id: parseInt(data.id),
		related: await Parse.details(data.details)
	};
}

async function parseListHTML(url: string) {
	const list = await getHTML(url).catch(err => {
		if (err.response.status === 404) throw new Error('Parameter Error');
		else throw err;
	});
	if (!list) throw new Error('No results found.');
	return Parse.list(list.details);
}

export class nhentaiClient {
	baseURL: string;

	constructor(baseURL = 'https://nhentai.net') {
		this.baseURL = baseURL;
	}

	async g(id: string) {
		let details = (await getHTML(`${this.baseURL}/api/gallery/${id}`)).details;
		let related = (await parseDetailsHTML(`${this.baseURL}/g/${id}/`)).related;
		let comments = (await getHTML(`${this.baseURL}/api/gallery/${id}/comments`)).details;
		details = (details && related && comments) ? details : undefined;
		return details ? new Gallery(details, related, comments) : details;
    }
    
	search(keyword: string, page = 1, sort = 'recent') {
		let query = qs.stringify({
			q: keyword,
			page,
			sort
		});
		return parseListHTML(`${this.baseURL}/search/?${query}`);
	}

	homepage(page = 1) {
		let query = qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/?${query}`);
	}

	async random() {
		let random = await parseDetailsHTML(`${this.baseURL}/random/`);
		let details = (await getHTML(`${this.baseURL}/api/gallery/${random.id}`)).details;
		let comments = (await getHTML(`${this.baseURL}/api/gallery/${random.id}`)).details;
		details = (details && random && comments) ? details : undefined;
		return details ? new Gallery(details, random.related, comments) : details;
	}

	tag(name: string, page = 1, sort = 'recent') {
		let query = qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/tag/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	artist(name: string, page = 1, sort = 'recent') {
		let query = qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/artist/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	character(name: string, page = 1, sort = 'recent') {
		let query = qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/character/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	parody(name: string, page = 1, sort = 'recent') {
		let query = qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/parody/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	group(name: string, page = 1, sort = 'recent') {
		let query = qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/group/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}
};