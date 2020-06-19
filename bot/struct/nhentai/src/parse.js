const Cheerio = require('cheerio');
const Qs = require('qs');

async function details(html) {
	const $ = Cheerio.load(html, {
		decodeEntities: false,
		xmlMode: false
	});

	let related = [];
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

	let galleryID = parseInt($('#gallery_id').text().substring(1), 10);

	return {
		galleryID,
		related
	};
}

function list(html) {
	const $ = Cheerio.load(html, {
		decodeEntities: false
	});

	let results = [];
	$('.gallery').each((i, e) => {
		let $this = $(e);
		let $thumb = $this.find('.cover>img');

		let language = '';
		let dataTags = $this.attr('data-tags').split(' ');
		if (dataTags.includes('6346')) language = 'japanese';
		else if (dataTags.includes('12227')) language = 'english';
		else if (dataTags.includes('29963')) language = 'chinese';

		results.push({
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

	let addon = {};

	if ($('meta[name=description]').length > 0 && !$('title').text().trim().startsWith('nhentai')) addon.num_results = parseInt($('meta[name=description]').attr('content').match(/Read ([0-9,]+).*/)[1].replace(',', ''), 10) || 0;
	else if ($('#content>h1').length > 0) addon.num_results = parseInt($('#content>h1').text().replace(',', ''), 10) || 0;

	if ($('.pagination').length > 0) addon.num_pages = parseInt($(`.pagination>${$('.pagination>.last').length > 0 ? '.last' : '.pagecurrent'}`).attr('href').match(/.*page=([0-9]+).*/)[1], 10) || 0;

	return {
		...addon,
		results
	};
}

module.exports = {
	details,
	list
};