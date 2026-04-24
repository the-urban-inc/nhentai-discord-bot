import {
    Gallery,
    Comment,
    Sort,
    SearchQuery,
    PartialGallery,
    GalleryListItem,
    TagLookupResult,
    Tag,
    TagType,
    pathToTypeChar,
    cleanImagePath,
    typeCharToExt,
} from './structures';
import { AxiosResponse, AxiosInstance } from 'axios';
import { Logger } from '../../structures/Logger';
import { createHttp } from './http';
import { SimpleCache, CacheOptions } from './cache';

const API_BASE = '/api/v2';
const DEFAULT_IMAGE_SERVERS = ['https://i1.nhentai.net', 'https://i2.nhentai.net', 'https://i3.nhentai.net', 'https://i4.nhentai.net'];
const DEFAULT_THUMB_SERVERS = ['https://t1.nhentai.net', 'https://t2.nhentai.net', 'https://t3.nhentai.net', 'https://t4.nhentai.net'];

// ─── v2 API response types (private to this module) ────────────────────────────

/** Page in a v2 gallery detail response */
interface V2Page {
    number: number;
    path: string;            // "galleries/1321705/1.png"
    width: number;
    height: number;
    thumbnail: string;       // "galleries/1321705/1t.png"
    thumbnail_width: number;
    thumbnail_height: number;
}

/** Root-level cover / thumbnail in v2 gallery detail */
interface V2Media {
    path: string;
    width: number;
    height: number;
}

/** Raw v2 /galleries/{id} response — cover/thumbnail/pages at root level */
interface V2GalleryDetail {
    id: number;
    media_id: string;
    title: {
        english: string;
        japanese: string | null;
        pretty: string;
    };
    cover: V2Media;
    thumbnail: V2Media;
    scanlator: string;
    upload_date: number;
    tags: Tag[];
    num_pages: number;
    num_favorites: number;
    pages: V2Page[];
    comments?: Comment[];
    related?: GalleryListItem[];
}

/** v2 /galleries response — no `total` field */
interface V2Galleries {
    result: GalleryListItem[];
    num_pages: number;
    per_page: number;
}

/** v2 /search responses — has `total` field */
interface V2Search {
    result: GalleryListItem[];
    total: number;
    num_pages: number;
    per_page: number;
}

/**
 * Converts a raw v2 gallery detail response into the internal `Gallery` shape.
 * The v2 response puts cover/thumbnail/pages at root level; this normalises them
 * into the nested `images:{}` structure so the rest of the codebase stays the same.
 */
function fromGalleryDetail(v2: V2GalleryDetail): Gallery {
    const coverClean = cleanImagePath(v2.cover.path);
    const thumbClean = cleanImagePath(v2.thumbnail.path);
    const coverChar = pathToTypeChar(coverClean);
    const thumbChar = pathToTypeChar(thumbClean);
    return {
        id: v2.id,
        media_id: v2.media_id,
        title: {
            english: v2.title.english,
            japanese: v2.title.japanese ?? '',
            pretty: v2.title.pretty || v2.title.english,
        },
        images: {
            pages: v2.pages.map(page => ({
                t: pathToTypeChar(cleanImagePath(page.path)),
                w: page.width,
                h: page.height,
            })),
            cover: { t: coverChar, w: v2.cover.width, h: v2.cover.height },
            thumbnail: { t: thumbChar, w: v2.thumbnail.width, h: v2.thumbnail.height },
        },
        scanlator: v2.scanlator,
        upload_date: v2.upload_date,
        tags: v2.tags,
        num_pages: v2.num_pages,
        num_favorites: v2.num_favorites,
    };
}

/**
 * Converts a v2 GalleryListItem (from search/home/popular/related arrays) into the
 * internal `Gallery` shape for use with displayGalleryList() / displayLazyGalleryList().
 * Pass `tagMap` from resolveTagIds() to populate full tag objects for list views.
 */
function fromGalleryListItem(item: GalleryListItem, tagMap?: Map<number, Tag>): Gallery {
    const thumbClean = cleanImagePath(item.thumbnail);
    const thumbChar = pathToTypeChar(thumbClean);
    return {
        id: item.id,
        media_id: item.media_id,
        title: {
            english: item.english_title,
            japanese: item.japanese_title ?? '',
            pretty: item.english_title,
        },
        images: {
            pages: [],           // not available in list responses
            cover: { t: thumbChar, w: item.thumbnail_width, h: item.thumbnail_height },
            thumbnail: { t: thumbChar, w: item.thumbnail_width, h: item.thumbnail_height },
        },
        scanlator: '',
        upload_date: 0,         // not available in list responses
        tags: item.tag_ids.map(id => tagMap?.get(id) ?? { id, type: null as any, name: '', url: '', count: 0 }),
        num_pages: item.num_pages,
        num_favorites: 0,
    };
}

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

    private logger: Logger;
    private http: AxiosInstance;
    private cache: SimpleCache | undefined;
    private imageServers: string[] = [];
    private thumbServers: string[] = [];

    constructor(options?: {
        logger?: Logger;
        http?: AxiosInstance;
        cacheOptions?: CacheOptions | false;
        /** MariaDB tag cache for resolving tag IDs without Tor API calls */
        tagCacheDb?: { resolveTagIds(ids: number[]): Promise<Map<number, { id: number; type: string; name: string; url: string; count: number }>> };
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
        this.tagCacheDb = options?.tagCacheDb;
    }

    /**
     * Initialize CDN servers. Uses hardcoded defaults to avoid burning a rate-limited
     * API request on startup. The defaults (i1-i4/t1-t4.nhentai.net) are stable.
     */
    public async initCdn(): Promise<void> {
        if (this.imageServers.length && this.thumbServers.length) return;
        this.imageServers = DEFAULT_IMAGE_SERVERS;
        this.thumbServers = DEFAULT_THUMB_SERVERS;
    }

    private baseImageURL(): string {
        if (!this.imageServers.length) return DEFAULT_IMAGE_SERVERS[0];
        return this.imageServers[Math.floor(Math.random() * this.imageServers.length)];
    }

    private baseThumbnailURL(): string {
        if (!this.thumbServers.length) return DEFAULT_THUMB_SERVERS[0];
        return this.thumbServers[Math.floor(Math.random() * this.thumbServers.length)];
    }

    private async fetch<T>(path: string, query?: SearchQuery): Promise<AxiosResponse<T>> {
        return this.http.get<T>(path, { params: query });
    }

    private async fetchJson<T>(path: string, query: Record<string, unknown> = {}): Promise<T> {
        return (await this.fetch<T>(path, query as SearchQuery)).data;
    }

    /**
     * Map internal Sort enum to v2 API sort parameter.
     * 'recent' → 'date' (the only required change; others are unchanged).
     */
    private sortToV2(sort?: Sort): string {
        if (sort === Sort.Recent) return 'date';
        return sort ?? '';
    }

    public async g(id: number, more = false): Promise<GalleryResult> {
        const cacheKey = `gallery:${id}:more:${more}`;
        const GALLERY_TTL = 6 * 60 * 60_000; // 6 hours — gallery metadata never changes
        if (this.cache) {
            const cached = this.cache.get<GalleryResult>(cacheKey);
            if (cached) return cached;
        }

        const include = more ? 'comments,related' : undefined;
        const v2 = await this.fetchJson<V2GalleryDetail>(
            `${API_BASE}/galleries/${id}`,
            include ? { include } : {}
        );
        const gallery = fromGalleryDetail(v2);
        if (!more) {
            const result = { gallery };
            this.cache?.set(cacheKey, result, GALLERY_TTL);
            return result;
        }
        const related = v2.related ?? [];
        const tagMap = await this.resolveTagIds(related.flatMap(item => item.tag_ids));
        const result = {
            gallery,
            related: related.map(item => fromGalleryListItem(item, tagMap)),
            comments: v2.comments ?? [],
        };
        this.cache?.set(cacheKey, result, GALLERY_TTL);
        return result;
    }

    public async random(more = false): Promise<GalleryResult> {
        const { id } = await this.fetchJson<{ id: number }>(`${API_BASE}/galleries/random`);
        return this.g(id, more);
    }

    public async home(page?: number): Promise<HomeResult> {
        const pageNum = page ?? 1;
        const keyResults = `home:page:${pageNum}`;
        const HOME_TTL = 30 * 60_000; // 30 minutes
        const POPULAR_TTL = 4 * 60 * 60_000; // 4 hours

        const listResponse = this.cache
            ? await this.cache.getOrSet(
                  keyResults,
                  async () => this.fetchJson<V2Galleries>(`${API_BASE}/galleries`, { page: pageNum }),
                  HOME_TTL
              )
            : await this.fetchJson<V2Galleries>(`${API_BASE}/galleries`, { page: pageNum });

        if (pageNum !== 1) {
            const tagMap = await this.resolveTagIds(
                listResponse.result.flatMap(item => item.tag_ids)
            );
            return { result: listResponse.result.map(item => fromGalleryListItem(item, tagMap)), num_pages: listResponse.num_pages, per_page: listResponse.per_page };
        }

        let popular_now: GalleryListItem[] = [];
        try {
            popular_now = this.cache
                ? await this.cache.getOrSet(
                      'popular_now',
                      async () => this.fetchJson<GalleryListItem[]>(`${API_BASE}/galleries/popular`),
                      POPULAR_TTL
                  )
                : await this.fetchJson<GalleryListItem[]>(`${API_BASE}/galleries/popular`);
        } catch (err: any) {
            if (err?.response?.status === 429) {
                this.logger.warn('[nhentai] /galleries/popular rate limited, returning home without popular');
            } else {
                this.logger.warn('[nhentai] /galleries/popular failed, returning home without popular:', err.message);
            }
        }

        // Collect all tag IDs from both lists to resolve in one batch
        const allItems = [...listResponse.result, ...popular_now];
        const tagMap = await this.resolveTagIds(allItems.flatMap(item => item.tag_ids));

        const result: HomeResult = {
            result: listResponse.result.map(item => fromGalleryListItem(item, tagMap)),
            num_pages: listResponse.num_pages,
            per_page: listResponse.per_page,
        };
        if (popular_now.length) {
            result.popular_now = popular_now.map(item => fromGalleryListItem(item, tagMap));
        }
        return result;
    }

    public async search(query: string, page?: number, sort?: Sort): Promise<SearchResult> {
        const normalizedQuery = (query || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const pageNum = page ?? 1;
        const sortKey = sort ?? 'none';
        const cacheKey = `search:${normalizedQuery}:page:${pageNum}:sort:${sortKey}`;
        const SEARCH_TTL = 15 * 60_000; // 15 minutes

        const fetchSearch = async () => {
            const v2 = await this.fetchJson<V2Search>(
                `${API_BASE}/search`,
                { query, page: pageNum, sort: this.sortToV2(sort) }
            );
            const tagMap = await this.resolveTagIds(v2.result.flatMap(item => item.tag_ids));
            return {
                result: v2.result.map(item => fromGalleryListItem(item, tagMap)),
                num_results: v2.total ?? 0,
                num_pages: v2.num_pages,
                per_page: v2.per_page,
            };
        };

        if (this.cache) {
            return await this.cache.getOrSet(cacheKey, fetchSearch, SEARCH_TTL);
        }
        return await fetchSearch();
    }


    private tagEndpoint(prefix: string) {
        return async (query: string, page?: number, sort?: Sort): Promise<TagResult> => {
            const normalizedQuery = (query || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const pageNum = page ?? 1;
            const sortKey = sort ?? 'none';
            const cacheKey = `tag:${prefix}:${normalizedQuery}:page:${pageNum}:sort:${sortKey}`;
            const TAG_TTL = 2 * 60 * 60_000; // 2 hours

            if (this.cache) {
                return await this.cache.getOrSet<TagResult>(
                    cacheKey,
                    async () => await this.tagLookup(prefix, query, page, sort),
                    TAG_TTL
                );
            }
            return await this.tagLookup(prefix, query, page, sort);
        };
    }

    /**
     * Resolve tag IDs → full Tag objects.
     * Tries MariaDB cache first (fast, no Tor), then falls back to v2 API for cache misses.
     */
    public async resolveTagIds(ids: number[]): Promise<Map<number, Tag>> {
        if (!ids.length) return new Map();
        const unique = [...new Set(ids)];
        const result = new Map<number, Tag>();

        // 1. Try MariaDB tag cache (no Tor, fast) — gracefully skip if unavailable
        if (this.tagCacheDb) {
            try {
                const dbTags = await this.tagCacheDb.resolveTagIds(unique);
                for (const [id, tag] of dbTags) {
                    const t: Tag = { id: tag.id, type: tag.type as TagType, name: tag.name, url: tag.url, count: tag.count };
                    this.tagCache.set(id, t);
                    result.set(id, t);
                }
            } catch (err) {
                this.logger.warn(`[nhentai] MariaDB tag cache unavailable, falling back to API: ${err.message}`);
            }
        }

        // 2. Check in-memory tagCache for anything still missing
        const missing = unique.filter(id => !result.has(id));
        if (missing.length) {
            const BATCH = 100;
            const batches: number[][] = [];
            for (let i = 0; i < missing.length; i += BATCH) batches.push(missing.slice(i, i + BATCH));

            const tagObjects = await Promise.all(
                batches.map(ids =>
                    this.fetchJson<Array<{ id: number; type: string; name: string; slug: string; url: string; count: number }>>(
                        `${API_BASE}/tags/ids?ids=${ids.join(',')}`
                    ).catch(() => [] as Array<{ id: number; type: string; name: string; slug: string; url: string; count: number }>)
                )
            );

            for (const batch of tagObjects) {
                for (const tag of batch) {
                    const t: Tag = { id: tag.id, type: tag.type as TagType, name: tag.name, url: tag.url, count: tag.count };
                    this.tagCache.set(tag.id, t);
                    result.set(tag.id, t);
                }
            }
        }

        return result;
    }

    private tagCache = new Map<number, Tag>();
    private tagCacheDb?: { resolveTagIds(ids: number[]): Promise<Map<number, { id: number; type: string; name: string; url: string; count: number }>> };

    /**
     * Direct tag lookup via GET /api/v2/tags/{type}/{slug}.
     * Returns `{tag_id, result, num_results, num_pages, per_page}`.
     * Throws AxiosError (404) when the tag genuinely does not exist.
     */
    private async tagLookup(
        prefix: string,
        query: string,
        page?: number,
        sort?: Sort
    ): Promise<TagResult> {
        const slug = query.replace(/ /g, '-').toLowerCase();
        const tag = await this.fetchJson<TagLookupResult>(`${API_BASE}/tags/${prefix}/${slug}`);
        const pageNum = page ?? 1;
        const v2 = await this.fetchJson<V2Galleries>(`${API_BASE}/galleries`, {
            tag_id: tag.id,
            page: pageNum,
            sort: this.sortToV2(sort),
        });
        const tagMap = await this.resolveTagIds(v2.result.flatMap(item => item.tag_ids));
        return {
            tag_id: tag.id,
            num_results: tag.count,
            result: v2.result.map(item => fromGalleryListItem(item, tagMap)),
            num_pages: v2.num_pages,
            per_page: v2.per_page,
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
        return gallery.images.pages.map((page, i) => {
            const ext = typeCharToExt(page.t);
            return `${this.baseImageURL()}/galleries/${gallery.media_id}/${i + 1}.${ext}`;
        });
    }

    /**
     * @deprecated Used only for MariaDB cache reads (PartialGallery has type chars).
     * Safe to keep as-is since MariaDB entries retain v1 shape.
     */
    public eduGuessPages(gallery: PartialGallery) {
        const pages: string[] = [];
        const ext = typeCharToExt(gallery.images.cover.t);
        for (let i = 0; i < gallery.num_pages; i++) {
            pages.push(`${this.baseImageURL()}/galleries/${gallery.media_id}/${i + 1}.${ext}`);
        }
        return pages;
    }

    /**
     * @deprecated Not currently called by any command — kept for future use.
     */
    public getPagesThumbnail(gallery: Gallery) {
        return gallery.images.pages.map((page, i) => {
            const ext = typeCharToExt(page.t);
            return `${this.baseThumbnailURL()}/galleries/${gallery.media_id}/${i + 1}t.${ext}`;
        });
    }

    public getCover(gallery: PartialGallery | Gallery) {
        const t = gallery.images.cover?.t ?? 'w';
        return `${this.baseThumbnailURL()}/galleries/${gallery.media_id}/cover.${typeCharToExt(t)}`;
    }

    public getCoverThumbnail(gallery: PartialGallery | Gallery) {
        const t =
            gallery.images.thumbnail?.t === 'n'
                ? gallery.images.cover?.t
                : gallery.images.thumbnail?.t ?? 'w';
        return `${this.baseThumbnailURL()}/galleries/${gallery.media_id}/thumb.${typeCharToExt(t)}`;
    }
}

export * from './structures';
