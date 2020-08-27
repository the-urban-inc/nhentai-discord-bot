import Cheerio from 'cheerio';
import { DoujinThumbnail } from './struct';

export async function details(html: string) {
	const $ = Cheerio.load(html, {
		decodeEntities: false,
		xmlMode: false
	});

	let related: Array<DoujinThumbnail>;
	$('.gallery').each((i, e) => {
		let $this = $(e);
		let $thumb = $this.find('.cover>img');

		let language = '';
		let dataTags = $this.attr('data-tags').split(' ');
		if (dataTags.includes('6346')) language = 'japanese';
		else if (dataTags.includes('12227')) language = 'english';
		else if (dataTags.includes('29963')) language = 'chinese';

		related.push({
			id: /(?<=\/g\/).+(?=\/)/.exec($this.find('.cover').attr('href'))[0],
			title: $this.find('.caption').html(),
			language,
			thumbnail: {
				s: $thumb.attr('data-src'),
				w: $thumb.attr('width'),
				h: $thumb.attr('height')
			}
		});
	});

	return related;
}

/**
 * parse into lists
 * @param {String} html 
 */
export function list(html: string) {
	const $ = Cheerio.load(html, {
		decodeEntities: false
	});

	
	let results = $('.gallery').toArray().map((e, i) => {
		let $this = $(e);
		let $thumb = $this.find('.cover>img');

		let language = '';
		let dataTags = $this.attr('data-tags').split(' ');
		if (dataTags.includes('6346')) language = 'japanese';
		else if (dataTags.includes('12227')) language = 'english';
		else if (dataTags.includes('29963')) language = 'chinese';

		return {
			id: /(?<=\/g\/).+(?=\/)/.exec($this.find('.cover').attr('href'))[0],
			title: $this.find('.caption').html(),
			language,
			thumbnail: {
				s: $thumb.attr('data-src'),
				w: $thumb.attr('width'),
				h: $thumb.attr('height')
			}
		};
	});

	let addon = {
		num_results: 0,
		num_pages: 0
	};

	if ($('meta[name=description]').length > 0 && !$('title').text().trim().startsWith('nhentai')) addon.num_results = parseInt($('meta[name=description]').attr('content').match(/Read ([0-9,]+).*/)[1].replace(',', ''), 10) || 0;
	else if ($('#content>h1').length > 0) addon.num_results = parseInt($('#content>h1').text().replace(',', ''), 10) || 0;

	if ($('.pagination').length > 0) addon.num_pages = parseInt($(`.pagination>${$('.pagination>.last').length > 0 ? '.last' : '.pagecurrent'}`).attr('href').match(/.*page=([0-9]+).*/)[1], 10) || 0;

	let tagId = $('.tag')?.attr('class')?.split(' ').filter(a => a.match(/(\d)+/));
	return {
		...addon,
		results,
		tagId: +(tagId || [])[0]?.replace('tag-', '') || null
	};
}

module.exports = {
	details,
	list
};