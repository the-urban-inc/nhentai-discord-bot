const getHTML = require('./src/get');
const Parse = require('./src/parse');
const Gallery = require('./src/gallery');
const logger = require('../../utils/logger');
const Qs = require('qs');

async function parseDetailsHTML(url) {
	return Parse.details(await getHTML(url).catch(err => {
		if (err.response.status == 404) logger.error('Doujin Not Found');
		else logger.error(err);
	}));
}

async function parseListHTML(url) {
	return Parse.list(await getHTML(url).catch(err => {
		if (err.response.status == 404) logger.error('Parameter Error');
		else logger.error(err);
	}));
}

module.exports = class nClient {

	constructor(baseURL = 'https://nhentai.net') {
		this.baseURL = baseURL;
	}

	async g(id) {
		return new Gallery(await parseDetailsHTML(`${this.baseURL}/g/${id}/`));
    }
    
	search(keyword, page = 1, sort = 'date') {
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

	random() {
		return parseDetailsHTML(`${this.baseURL}/random/`);
	}

	tag(name, page = 1, sort = 'date') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/tag/${name.replace(' ','-')}/${sort=='date'?'':sort}?${query}`);
	}

	artist(name, page = 1, sort = 'date') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/artist/${name.replace(' ','-')}/${sort=='date'?'':sort}?${query}`);
	}

	character(name, page = 1, sort = 'date') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/character/${name.replace(' ','-')}/${sort=='date'?'':sort}?${query}`);
	}

	parody(name, page = 1, sort = 'date') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/parody/${name.replace(' ','-')}/${sort=='date'?'':sort}?${query}`);
	}

	group(name, page = 1, sort = 'date') {
		let query = Qs.stringify({
			page
		});
		return parseListHTML(`${this.baseURL}/group/${name.replace(' ','-')}/${sort=='date'?'':sort}?${query}`);
	}
};