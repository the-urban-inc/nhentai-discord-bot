const getHTML = require('./src/get');
const Parse = require('./src/parse');
const Gallery = require('./src/gallery');
const logger = require('../../utils/logger');
const Qs = require('qs');

async function parseDetailsHTML(url) {
	const details = await getHTML(url).catch(err => {
		if (err.response.status == 404) return logger.error('Doujin Not Found');
		else return logger.error(err);
	});
	if (!details) return undefined;
	return Parse.details(details);
}

async function parseListHTML(url) {
	const list = await getHTML(url).catch(err => {
		if (err.response.status == 404) return logger.error('Parameter Error');
		else return logger.error(err);
	});
	if (!list) return undefined;
	return Parse.list(list);
}

module.exports = class nClient {

	constructor(baseURL = 'https://nhentai.net') {
		this.baseURL = baseURL;
	}

	async g(id) {
		let details = await getHTML(`${this.baseURL}/api/gallery/${id}`);
		let related = await parseDetailsHTML(`${this.baseURL}/g/${id}/`);
		let comments = await getHTML(`${this.baseURL}/api/gallery/${id}/comments`);
		details = (details && related && comments) ? details : undefined;
		return details ? new Gallery({ ...details, ...related, comments }) : details;
    }
    
	search(keyword, page = 1, sort = 'recent') {
		let query = Qs.stringify({
			q: keyword,
			page,
			sort
		});
		return parseListHTML(`${this.baseURL}/search/?${query}`);
	}

	homepage(page = 1) {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/?${query}`);
	}

	async random() {
		let related = await parseDetailsHTML(`${this.baseURL}/random/`);
		let details = await getHTML(`${this.baseURL}/api/gallery/${related.galleryID}`);
		let comments = await getHTML(`${this.baseURL}/api/gallery/${related.galleryID}`);
		details = (details && related && comments) ? details : undefined;
		return details ? new Gallery({ ...details, ...related, comments }) : details;
	}

	tag(name, page = 1, sort = 'recent') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/tag/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	artist(name, page = 1, sort = 'recent') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/artist/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	character(name, page = 1, sort = 'recent') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/character/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	parody(name, page = 1, sort = 'recent') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/parody/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}

	group(name, page = 1, sort = 'recent') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/group/${name.replace(' ','-')}/${sort=='recent'?'':sort}?${query}`);
	}
};