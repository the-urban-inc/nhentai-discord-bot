import { Gallery, Related, Comment, Search, SearchQuery, Sort, ImageT } from './lib/structures';
import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';
type Root = ReturnType<typeof load>;
import qs from 'qs';

export interface GalleryResult {
    gallery: Gallery;
    related?: Gallery[];
    comments?: Comment[];
}

export interface HomeResult {
    popular_now?: Gallery[];
    result: Gallery[];
    num_pages: number;
    per_page: number;
}

export interface SearchResult {
    result: Gallery[];
    num_results: number;
    num_pages: number;
    per_page: number;
}

export interface TagResult {
    tag_id: number;
    result: Gallery[];
    num_results: number;
    num_pages: number;
    per_page: number;
}

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

    private async tagID($: Root): Promise<number | null> {
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

    private async numResults($: Root): Promise<number> {
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

    private async popularNow($: Root): Promise<Gallery[]> {
        return Promise.all(
            $('.index-popular .gallery')
                .toArray()
                .map(async (e, i) => {
                    const id = $(e)
                        .find('.cover')
                        ?.attr('href')
                        ?.match(/(?<=\/g\/).+(?=\/)/);
                    if (!id || !id[0]) throw new Error('Invalid ID');
                    return (await this.g(parseInt(id[0], 10))).gallery;
                })
        );
    }

    public async g(id: number, more = false): Promise<GalleryResult> {
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

    public async random(more = false): Promise<GalleryResult> {
        const id = await this.fetch(`/random`).then(
            res =>
                +res.request.res.responseUrl.match(
                    /(?:(?:https?:\/\/)?nhentai\.net\/g\/)?([0-9]{1,6})/i
                )[1]
        );
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return await this.g(id, more);
    }

    public async home(page?: number): Promise<HomeResult> {
        const results = await this.fetch<Search>(`/api/galleries/all`, { page }).then(
            res => res.data
        );
        if (page !== 1) return results;
        const popular_now = await this.fetch(`/`).then(async res => {
            const $ = load(<string>res.data, {
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

    public async search(query: string, page?: number, sort?: Sort): Promise<SearchResult> {
        const num_results = await this.fetch(`/search/`, { q: query, page, sort }).then(
            async res => {
                const $ = load(<string>res.data, {
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

    private async fromID(tag_id: number, page?: number, sort?: Sort): Promise<Search> {
        return await this.fetch<Search>(`/api/galleries/tagged`, {
            tag_id,
            page,
            sort,
        }).then(res => res.data);
    }

    public async tag(query: string, page?: number, sort?: Sort): Promise<TagResult> {
        const { id, num_results } = await this.fetch(`/tag/${query.replace(/ /g, '-')}`).then(
            async res => {
                const $ = load(<string>res.data, {
                    decodeEntities: false,
                    xmlMode: false,
                });
                return {
                    id: await this.tagID($),
                    num_results: await this.numResults($),
                };
            }
        );
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
    }

    public async artist(query: string, page?: number, sort?: Sort): Promise<TagResult> {
        const { id, num_results } = await this.fetch(`/artist/${query.replace(/ /g, '-')}`).then(async res => {
            const $ = load(<string>res.data, {
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

    public async character(query: string, page?: number, sort?: Sort): Promise<TagResult> {
        const { id, num_results } = await this.fetch(`/character/${query.replace(/ /g, '-')}`).then(async res => {
            const $ = load(<string>res.data, {
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

    public async group(query: string, page?: number, sort?: Sort): Promise<TagResult> {
        const { id, num_results } = await this.fetch(`/group/${query.replace(/ /g, '-')}`).then(async res => {
            const $ = load(<string>res.data, {
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

    public async parody(query: string, page?: number, sort?: Sort): Promise<TagResult> {
        const { id, num_results } = await this.fetch(`/parody/${query.replace(/ /g, '-')}`).then(async res => {
            const $ = load(<string>res.data, {
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

    public async language(query: string, page?: number, sort?: Sort): Promise<TagResult> {
        const { id, num_results } = await this.fetch(`/language/${query.replace(/ /g, '-')}`).then(async res => {
            const $ = load(<string>res.data, {
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
