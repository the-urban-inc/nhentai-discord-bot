import { Gallery, Related, Comment, Search, SearchQuery, Sort, ImageT } from './lib/structures';
import axios, { AxiosResponse } from 'axios';
import qs from 'qs';
import Cheerio from 'cheerio';

export class Client {
    public baseURL = 'https://nhentai.net';
    public baseImageURL = 'https://i.nhentai.net';
    public baseThumbnailURL = 'https://t.nhentai.net';

    private async fetch<T>(path: string, query?: SearchQuery): Promise<AxiosResponse<T>> {
        const q = qs.stringify(query);
        const url = `${this.baseURL}${path}${q ? `?${q}` : ''}`;
        const res = await axios.get(url);
        if (res.data.error) throw new Error(res.data.error);
        return res;
    }

    private async fromID(tag_id: number, page = 1, sort = Sort.Recent): Promise<Search> {
        return await this.fetch<Search>(`/api/galleries/tagged`, {
            tag_id,
            page,
            sort,
        }).then(res => res.data);
    }

    private async tagID($: CheerioStatic): Promise<number | null> {
        const id =
            parseInt(
                ($('.tag')
                    ?.attr('class')
                    ?.split(' ')
                    .filter(a => a.match(/(\d)+/)) || [])[0]?.replace('tag-', ''),
                10
            ) || null;
        return id;
    }

    private async numResults($: CheerioStatic): Promise<number> {
        let num_results = 0;
        if (
            $('meta[name=description]').length > 0 &&
            !$('title').text().trim().startsWith('nhentai')
        ) {
            num_results =
                parseInt(
                    ($('meta[name=description]')
                        ?.attr('content')
                        ?.match(/Read ([0-9,]+).*/) || [])[1].replace(',', ''),
                    10
                ) || 0;
        } else if ($('#content>h1').length > 0) {
            num_results = parseInt($('#content>h1').text().replace(',', ''), 10) || 0;
        }
        return num_results;
    }

    private async popularNow($: CheerioStatic): Promise<Gallery[]> {
        return $('.index-popular .gallery')
            .toArray()
            .map((e, i) => {
                const id = $(e)
                    .find('.cover')
                    ?.attr('href')
                    ?.match(/(?<=\/g\/).+(?=\/)/);
                if (!id || !id[0]) throw new Error('Invalid ID');
                return <Gallery>(this.g(parseInt(id[0], 10)) as unknown);
            });
    }

    public async g(
        id: number,
        more = false
    ): Promise<{
        gallery: Gallery;
        related?: Gallery[];
        comments?: Comment[];
    }> {
        const gallery = await this.fetch<Gallery>(`/api/gallery/${id}`).then(res => res.data);
        if (!more) return { gallery };
        const related = await this.fetch<Related>(`/api/gallery/${id}/related`).then(
            res => res.data
        );
        const comments = await this.fetch<Comment[]>(`/api/gallery/${id}/comments`).then(
            res => res.data
        );
        return { gallery, related: related.result, comments };
    }

    public async random(
        more = false
    ): Promise<{
        gallery: Gallery;
        related?: Gallery[];
        comments?: Comment[];
    }> {
        const id = await this.fetch(`/random`).then(
            res =>
                +res.request.res.responseUrl.match(
                    /(?:(?:https?:\/\/)?nhentai\.net\/g\/)?([0-9]{1,6})/i
                )[1]
        );
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return await this.g(id, more);
    }

    public async home(page = 1): Promise<Search & { popular_now?: Gallery[] }> {
        const results = await this.fetch<Search>(`/api/galleries/all`, { page }).then(
            res => res.data
        );
        if (page === 1) return results;
        const popular_now = await this.fetch(`/`, { page }).then(async res => {
            const $ = Cheerio.load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return await this.popularNow($);
        });
        return {
            ...results,
            popular_now,
        };
    }

    public async search(
        query: string,
        page = 1,
        sort = Sort.Recent
    ): Promise<Search & { num_results: number }> {
        const num_results = await this.fetch(`/search/`, { q: query, page, sort }).then(
            async res => {
                const $ = Cheerio.load(<string>res.data, {
                    decodeEntities: false,
                    xmlMode: false,
                });
                return await this.numResults($);
            }
        );
        return {
            ...(await this.fetch<Search>(`/api/galleries/search`, { query, page, sort }).then(
                res => res.data
            )),
            num_results,
        };
    }

    public async tag(
        query: string,
        page = 1,
        sort = Sort.Recent
    ): Promise<Search & { tag_id: number, num_results: number }> {
        const { id, num_results } = await this.fetch(`/tag/${query}`).then(async res => {
            const $ = Cheerio.load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return {
                id: await this.tagID($),
                num_results: await this.numResults($),
            };
        });
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
    }

    public async artist(
        query: string,
        page = 1,
        sort = Sort.Recent
    ): Promise<Search & { tag_id: number, num_results: number }> {
        const { id, num_results } = await this.fetch(`/artist/${query}`).then(async res => {
            const $ = Cheerio.load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return {
                id: await this.tagID($),
                num_results: await this.numResults($),
            };
        });
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
    }

    public async character(
        query: string,
        page = 1,
        sort = Sort.Recent
    ): Promise<Search & { tag_id: number, num_results: number }> {
        const { id, num_results } = await this.fetch(`/character/${query}`).then(async res => {
            const $ = Cheerio.load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return {
                id: await this.tagID($),
                num_results: await this.numResults($),
            };
        });
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
    }

    public async group(
        query: string,
        page = 1,
        sort = Sort.Recent
    ): Promise<Search & { tag_id: number, num_results: number }> {
        const { id, num_results } = await this.fetch(`/group/${query}`).then(async res => {
            const $ = Cheerio.load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return {
                id: await this.tagID($),
                num_results: await this.numResults($),
            };
        });
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
    }

    public async parody(
        query: string,
        page = 1,
        sort = Sort.Recent
    ): Promise<Search & { tag_id: number, num_results: number }> {
        const { id, num_results } = await this.fetch(`/parody/${query}`).then(async res => {
            const $ = Cheerio.load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return {
                id: await this.tagID($),
                num_results: await this.numResults($),
            };
        });
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
    }

    public async language(
        query: string,
        page = 1,
        sort = Sort.Recent
    ): Promise<Search & { tag_id: number, num_results: number }> {
        const { id, num_results } = await this.fetch(`/language/${query}`).then(async res => {
            const $ = Cheerio.load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return {
                id: await this.tagID($),
                num_results: await this.numResults($),
            };
        });
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
    }

    public getPages(gallery: Gallery) {
        const pages: string[] = [];
        gallery.images.pages.forEach((page, i) => {
            pages.push(
                `${this.baseImageURL}/galleries/${gallery.media_id}/${i + 1}.${ImageT[page.t]}`
            );
        });
        return pages;
    }

    public getPagesThumbnail(gallery: Gallery) {
        const pages: string[] = [];
        gallery.images.pages.forEach((page, i) => {
            pages.push(
                `${this.baseThumbnailURL}/galleries/${gallery.media_id}/${i + 1}t.${ImageT[page.t]}`
            );
        });
        return pages;
    }

    public getCover(gallery: Gallery) {
        return `${this.baseThumbnailURL}/galleries/${gallery.media_id}/cover.${
            ImageT[gallery.images.cover.t]
        }`;
    }

    public getCoverThumbnail(gallery: Gallery) {
        return `${this.baseThumbnailURL}/galleries/${gallery.media_id}/thumb.${
            ImageT[gallery.images.cover.t]
        }`;
    }
}

export * from './lib/structures';
