import Cheerio from 'cheerio';
import { Thumbnail, List } from './struct';

/**
 * Scrapes the More Like This section of a gallery page
 * @param html The html of the gallery
 * @returns An array of gallery thumbnail
 */
export async function related(html: string): Promise<Thumbnail[]> {
    const $ = Cheerio.load(html, {
        decodeEntities: false,
        xmlMode: false,
    });

    let related: Thumbnail[] = $('.gallery')
        .toArray()
        .map((e, i) => {
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
                dataTags,
                thumbnail: {
                    s: $thumb.attr('data-src'),
                    w: $thumb.attr('width'),
                    h: $thumb.attr('height'),
                },
            };
        });

    return related;
}

/**
 * Scrapes gallery list
 * @param html The html of the gallery list page
 * @returns An array of doujin thumbnail with num_pages, num_results and tagId if this is a tag page
 */
export async function list(html: string): Promise<List> {
    const $ = Cheerio.load(html, {
        decodeEntities: false,
    });

    let results: Thumbnail[] = $('.gallery')
        .toArray()
        .map((e, i) => {
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
                dataTags,
                thumbnail: {
                    s: $thumb.attr('data-src'),
                    w: $thumb.attr('width'),
                    h: $thumb.attr('height'),
                },
            };
        });

    let addon = {
        num_results: 0,
        num_pages: 0,
    };

    if ($('meta[name=description]').length > 0 && !$('title').text().trim().startsWith('nhentai'))
        addon.num_results =
            parseInt(
                $('meta[name=description]')
                    .attr('content')
                    .match(/Read ([0-9,]+).*/)[1]
                    .replace(',', ''),
                10
            ) || 0;
    else if ($('#content>h1').length > 0)
        addon.num_results = parseInt($('#content>h1').text().replace(',', ''), 10) || 0;

    if ($('.pagination').length > 0)
        addon.num_pages =
            parseInt(
                $(`.pagination>${$('.pagination>.last').length > 0 ? '.last' : '.pagecurrent'}`)
                    .attr('href')
                    .match(/.*page=([0-9]+).*/)[1],
                10
            ) || 0;

    let tagId = $('.tag')
        ?.attr('class')
        ?.split(' ')
        .filter(a => a.match(/(\d)+/));
    return {
        ...addon,
        results,
        tagId: +(tagId || [])[0]?.replace('tag-', '') || null,
    } as List;
}

module.exports = {
    related,
    list,
};
