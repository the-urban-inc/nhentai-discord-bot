import {
    Gallery,
    Related,
    Comment,
    Search,
    SearchQuery,
    Sort,
    ImageT,
    PartialGallery,
} from './structures';
import { AxiosResponse, AxiosInstance } from 'axios';
import { load } from 'cheerio';
type Root = ReturnType<typeof load>;
import { Logger } from '../../structures/Logger';
import { createHttp } from './http';
import { SimpleCache, CacheOptions } from './cache';

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
    public socksProxy = process.env.NHENTAI_SOCKS_PROXY || '';
    public baseURL = process.env.NHENTAI_URL || 'https://nhentai.net';
    public baseImageURL = () => `https://i${Math.floor(Math.random() * 4) + 1}.nhentai.net`;
    public baseThumbnailURL = () => `https://t${Math.floor(Math.random() * 4) + 1}.nhentai.net`;

    private logger: Logger;
    private http: AxiosInstance;
    private cache: SimpleCache | undefined;

    constructor(options?: {
        logger?: Logger;
        http?: AxiosInstance;
        cacheOptions?: CacheOptions | false;
    }) {
        this.logger = options?.logger || new Logger();
        this.http =
            options?.http ||
            createHttp(this.baseURL, this.logger, this.socksProxy, { maxRetries: 2 });
        if (options?.cacheOptions === false) {
            this.cache = undefined;
        } else {
            const cfg =
                options && typeof options.cacheOptions === 'object'
                    ? (options.cacheOptions as CacheOptions)
                    : undefined;
            this.cache = new SimpleCache(cfg);
        }
    }

    private async fetch<T>(path: string, query?: SearchQuery): Promise<AxiosResponse<T>> {
        return this.http.get<T>(path, { params: query });
    }

    private async fetchJson<T>(path: string, query?: SearchQuery): Promise<T> {
        return (await this.fetch<T>(path, query)).data;
    }

    private async fetchHtml(path: string, query?: SearchQuery) {
        const res = await this.fetch<string>(path, query);
        return load(<string>res.data, { decodeEntities: false, xmlMode: false });
    }

    private async pageMeta(path: string) {
        const $ = await this.fetchHtml(path);
        return { id: await this.tagID($), num_results: await this.numResults($) };
    }

    private async galleryID($: Root): Promise<number | null> {
        const id = parseInt($('#gallery_id').text().slice(1), 10) || null;
        return id;
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
        const key = `/api/gallery/${id}`;
        const gallery = await this.fetchJson<Gallery>(key);
        if (!more) return { gallery };
        const related = await this.fetchJson<Related>(`/api/gallery/${id}/related`);
        const comments = await this.fetchJson<Comment[]>(`/api/gallery/${id}/comments`);
        return { gallery, related: related.result, comments };
    }

    public async random(more = false): Promise<GalleryResult> {
        const $ = await this.fetchHtml(`/random`);
        const id = await this.galleryID($);
        if (!id || isNaN(id)) throw new Error('Invalid ID');
        return await this.g(id, more);
    }

    public async home(page?: number): Promise<HomeResult> {
        const pageNum = page ?? 1;
        const keyResults = `home:page:${pageNum}`;
        const HOME_TTL = 5 * 60_000; // 5 minutes
        const POPULAR_TTL = 30 * 60_000; // 30 minutes

        const results = this.cache
            ? await this.cache.getOrSet(
                  keyResults,
                  async () => this.fetchJson<Search>(`/api/galleries/all`, { page }),
                  HOME_TTL
              )
            : await this.fetchJson<Search>(`/api/galleries/all`, { page });
        if (pageNum !== 1) return results;

        const popular_now = this.cache
            ? await this.cache.getOrSet(
                  'popular_now',
                  async () => {
                      const $ = await this.fetchHtml(`/`);
                      return await this.popularNow($);
                  },
                  POPULAR_TTL
              )
            : await this.popularNow(await this.fetchHtml(`/`));
        return {
            ...results,
            popular_now,
        };
    }

    public async search(query: string, page?: number, sort?: Sort): Promise<SearchResult> {
        const $ = await this.fetchHtml(`/search/`, { q: query, page, sort });
        const num_results = await this.numResults($);

        return {
            ...(await this.fetchJson<Search>(`/api/galleries/search`, { q: query, page, sort })),
            num_results,
        };
    }

    private async fromID(tag_id: number, page?: number, sort?: Sort): Promise<Search> {
        return await this.fetchJson<Search>(`/api/galleries/tagged`, { tag_id, page, sort });
    }

    private tagEndpoint(prefix: string) {
        return async (query: string, page?: number, sort?: Sort): Promise<TagResult> => {
            const normalizedQuery = (query || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const pageNum = page ?? 1;
            const sortKey = sort ?? 'none';
            const cacheKey = `tag:${prefix}:${normalizedQuery}:page:${pageNum}:sort:${sortKey}`;
            const TAG_TTL = 15 * 60_000; // 15 minutes

            if (this.cache) {
                return await this.cache.getOrSet<TagResult>(
                    cacheKey,
                    async () => {
                        const { id, num_results } = await this.pageMeta(
                            `/${prefix}/${query.replace(/ /g, '-')}`
                        );
                        if (!id || isNaN(id)) throw new Error('Invalid ID');
                        return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
                    },
                    TAG_TTL
                );
            }

            const { id, num_results } = await this.pageMeta(`/${prefix}/${query.replace(/ /g, '-')}`);
            if (!id || isNaN(id)) throw new Error('Invalid ID');
            return { ...(await this.fromID(id, page, sort)), tag_id: id, num_results };
        };
    }

    public tag = this.tagEndpoint('tag');
    public artist = this.tagEndpoint('artist');
    public category = this.tagEndpoint('category');
    public character = this.tagEndpoint('character');
    public group = this.tagEndpoint('group');
    public parody = this.tagEndpoint('parody');
    public language = this.tagEndpoint('language');

    public getPages(gallery: Gallery) {
        const pages: string[] = [];
        gallery.images.pages.forEach((page, i) => {
            pages.push(
                `${this.baseImageURL()}/galleries/${gallery.media_id}/${i + 1}.${ImageT[page.t]}`
            );
        });
        return pages;
    }

    public eduGuessPages(gallery: PartialGallery) {
        const pages: string[] = [];
        for (let i = 0; i < gallery.num_pages; i++) {
            pages.push(
                `${this.baseImageURL()}/galleries/${gallery.media_id}/${i + 1}.${
                    ImageT[gallery.images.cover.t]
                }`
            );
        }
        return pages;
    }

    public getPagesThumbnail(gallery: Gallery) {
        const pages: string[] = [];
        gallery.images.pages.forEach((page, i) => {
            pages.push(
                `${this.baseThumbnailURL()}/galleries/${gallery.media_id}/${i + 1}t.${
                    ImageT[page.t]
                }`
            );
        });
        return pages;
    }

    public getCover(gallery: PartialGallery | Gallery) {
        return `${this.baseThumbnailURL()}/galleries/${gallery.media_id}/cover.${
            ImageT[gallery.images.cover.t || 'w']
        }`;
    }

    public getCoverThumbnail(gallery: PartialGallery | Gallery) {
        return `${this.baseThumbnailURL()}/galleries/${gallery.media_id}/thumb.${
            ImageT[
                (gallery.images.thumbnail.t === 'n'
                    ? gallery.images.cover.t
                    : gallery.images.thumbnail.t) || 'w'
            ]
        }`;
    }
}

export * from './structures';
