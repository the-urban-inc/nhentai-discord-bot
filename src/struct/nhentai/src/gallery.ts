import { DoujinDetails, DoujinThumbnail, DoujinComment } from './struct';

const TYPE = {
	'j': 'jpg',
	'p': 'png',
	'g': 'gif'
};

export class Gallery {
	details: DoujinDetails
	related: DoujinThumbnail[]
	comments: DoujinComment[]

	constructor(details: DoujinDetails, related: DoujinThumbnail[], comments: DoujinComment[]) {
		this.details = details;
		this.related = related;
		this.comments = comments;
	}

	getPages(baseURL = 'https://i.nhentai.net') {
		let pages: string[] = [];
		this.details.images.pages.forEach((page, i) => {
			pages.push(`${baseURL}/galleries/${this.details.media_id}/${i+1}.${TYPE[page.t as keyof typeof TYPE]}`);
		});
		return pages;
	}

	getPagesThumbnail(baseURL = 'https://t.nhentai.net') {
		let pages: string[] = [];
		this.details.images.pages.forEach((page, i) => {
			pages.push(`${baseURL}/galleries/${this.details.media_id}/${i+1}t.${TYPE[page.t as keyof typeof TYPE]}`);
		});
		return pages;
	}

	getCover(baseURL = 'https://t.nhentai.net') {
		return `${baseURL}/galleries/${this.details.media_id}/cover.${TYPE[this.details.images.cover.t as keyof typeof TYPE]}`;
	}

	getCoverThumbnail(baseURL = 'https://t.nhentai.net') {
		return `${baseURL}/galleries/${this.details.media_id}/thumb.${TYPE[this.details.images.cover.t as keyof typeof TYPE]}`;
	}
};