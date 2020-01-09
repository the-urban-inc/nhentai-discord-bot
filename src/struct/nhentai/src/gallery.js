TYPE = {
	j: 'jpg',
	p: 'png',
	g: 'gif'
};

module.exports = class Gallery {

	constructor(obj) {
		for (let key in obj) {
			this[key] = obj[key];
		}
	}

	getPages(baseURL = 'https://i.nhentai.net') {
		let pages = [];
		this.images.pages.forEach((page, i) => {
			pages.push(`${baseURL}/galleries/${this.media_id}/${i+1}.${TYPE[page.t]}`);
		});
		return pages;
	}

	getPagesThumbnail(baseURL = 'https://t.nhentai.net') {
		let pages = [];
		this.images.pages.forEach((page, i) => {
			pages.push(`${baseURL}/galleries/${this.media_id}/${i+1}t.${TYPE[page.t]}`);
		});
		return pages;
	}

	getCover(baseURL = 'https://t.nhentai.net') {
		return `${baseURL}/galleries/${this.media_id}/cover.${TYPE[this.images.cover.t]}`;
	}

	getCoverThumbnail(baseURL = 'https://t.nhentai.net') {
		return `${baseURL}/galleries/${this.media_id}/thumb.${TYPE[this.images.cover.t]}`;
	}
};