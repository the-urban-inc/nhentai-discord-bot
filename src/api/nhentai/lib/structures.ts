export interface Image {
    t: 'j' | 'p' | 'g';
    w: number;
    h: number;
}

enum ImageType {
    JPG = 'jpg',
    PNG = 'png',
    GIF = 'gif',
}

export const ImageT = {
    'j': ImageType.JPG,
    'p': ImageType.PNG,
    'g': ImageType.GIF
}

export enum Language {
    English = 'english',
    Japanese = 'japanese',
    Chinese = 'chinese',
}

enum TagType {
    Tag = 'tag',
    Artist = 'artist',
    Character = 'character',
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

export interface Gallery {
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

export interface Related {
    result: Gallery[];
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

export interface Search {
    result: Gallery[];
    num_pages: number;
    per_page: number;
}

export enum Sort {
    Recent = 'recent',
    PopularToday = 'popular-today',
    PopularWeek = 'popular-week',
    PopularAllTime = 'popular',
}

export interface SearchQuery {
    q?: string;
    query?: string;
    tag_id?: number;
    page?: number;
    sort?: Sort;
}