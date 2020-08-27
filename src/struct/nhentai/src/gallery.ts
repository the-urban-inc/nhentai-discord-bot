import { DoujinDetails, DoujinThumbnail, DoujinComment } from './struct';

const TYPE = {
	'j': 'jpg',
	'p': 'png',
	'g': 'gif'
};

export class Gallery extends DoujinDetails {
	related: Array<DoujinThumbnail>
	comments: Array<DoujinComment>

	constructor(details: DoujinDetails, related: Array<DoujinThumbnail>, comments: Array<DoujinComment>) {
		super();
		this.related = related;
		this.comments = comments;
	}

	getPages(baseURL = 'https://i.nhentai.net') {
		let pages: Array<string>;
		this.images.pages.forEach((page, i) => {
			pages.push(`${baseURL}/galleries/${this.media_id}/${i+1}.${TYPE[page.t as keyof typeof TYPE]}`);
		});
		return pages;
	}

	getPagesThumbnail(baseURL = 'https://t.nhentai.net') {
		let pages: Array<string>;
		this.images.pages.forEach((page, i) => {
			pages.push(`${baseURL}/galleries/${this.media_id}/${i+1}t.${TYPE[page.t as keyof typeof TYPE]}`);
		});
		return pages;
	}

	getCover(baseURL = 'https://t.nhentai.net') {
		return `${baseURL}/galleries/${this.media_id}/cover.${TYPE[this.images.cover.t as keyof typeof TYPE]}`;
	}

	getCoverThumbnail(baseURL = 'https://t.nhentai.net') {
		return `${baseURL}/galleries/${this.media_id}/thumb.${TYPE[this.images.cover.t as keyof typeof TYPE]}`;
	}
};