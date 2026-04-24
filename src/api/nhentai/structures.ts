// ─── Shared types ────────────────────────────────────────────────────────────────

/**
 * Maps a v2 image path extension to the type-char used by the MariaDB cache schema.
 */
export function pathToTypeChar(path: string): 'j' | 'p' | 'g' | 'w' | 'n' {
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') return 'j';
    if (ext === 'png') return 'p';
    if (ext === 'gif') return 'g';
    if (ext === 'webp') return 'w';
    return 'n'; // unknown / avif / webp double-extension edge case
}

/**
 * Cleans double-extension paths like "cover.webp.webp" → "cover.webp".
 * Only strips when the SAME extension is duplicated, preserving paths like
 * "thumb.jpg.webp" (a webp thumbnail of a jpg source).
 */
export function cleanImagePath(path: string): string {
    return path.replace(/\.(jpe?g|png|gif|webp)\.\1$/, '.$1');
}

/**
 * Converts a type char (stored in Gallery.images.cover.t etc.) to a full file extension.
 */
export function typeCharToExt(t: Image['t']): string {
    switch (t) {
        case 'j': return 'jpg';
        case 'p': return 'png';
        case 'g': return 'gif';
        case 'w': return 'webp';
        default:  return 'unknown';
    }
}

/** Flat item returned by /search, /galleries, and the related field of /galleries/{id} */
export interface GalleryListItem {
    id: number;
    media_id: string;
    english_title: string;
    japanese_title: string | null;
    thumbnail: string;          // "galleries/3886754/thumb.webp"
    thumbnail_width: number;
    thumbnail_height: number;
    num_pages: number;
    tag_ids: number[];          // only IDs — no counts
    blacklisted: boolean;
}

/** Tag lookup result from GET /api/v2/tags/{type}/{slug} */
export interface TagLookupResult {
    id: number;
    type: TagType;
    name: string;
    slug: string;
    url: string;
    count: number;
}

export interface Image {
    t: 'j' | 'p' | 'g' | 'w' | 'n';
    w: number;
    h: number;
}

export enum Language {
    English = 'english',
    Japanese = 'japanese',
    Chinese = 'chinese',
}

export enum TagType {
    Tag = 'tag',
    Artist = 'artist',
    Character = 'character',
    Category = 'category',
    Group = 'group',
    Parody = 'parody',
    Language = 'language',
}

export interface Tag {
    id: number;
    type: TagType;
    name: string;
    url: string;
    count: number;
}

export interface PartialGallery {
    id: number | string;
    media_id: number | string;
    title: {
        english: string,
        japanese: string,
        pretty: string,
    };
    images: {
        cover: {
            t: Image['t'],
        },
        thumbnail: {
            t: Image['t'],
        },
    };
    upload_date: number;
    tags: {
        id: number;
        type: TagType;
        name: string;
        count: number;
    }[];
    num_pages: number;
    num_favorites: number;
}

export interface Gallery extends PartialGallery {
    id: number | string;
    media_id: number | string;
    title: {
        english: string,
        japanese: string,
        pretty: string,
    };
    images: {
        pages: Image[],
        cover: Image,
        thumbnail: Image,
    };
    scanlator: string;
    upload_date: number;
    tags: Tag[];
    num_pages: number;
    num_favorites: number;
}


export interface Comment {
    id: number | string;
    gallery_id: number | string;
    poster: {
        id: number;
        username: string;
        slug: string;
        avatar_url: string;
        is_superuser: boolean;
        is_staff: boolean;
    };
    post_date: number;
    body: string;
}

export enum Sort {
    Recent = 'recent',
    PopularToday = 'popular-today',
    PopularWeek = 'popular-week',
    PopularMonth = 'popular-month',
    PopularAllTime = 'popular',
}

export interface SearchQuery {
    q?: string;
    query?: string;
    tag_id?: number;
    page?: number;
    sort?: Sort;
}
