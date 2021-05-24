export interface BaseTag {
    name: string;
    href: string;
}

export interface Doujin {
    title: string;
    book?: BaseTag;
    price?: string;
    artist: BaseTag[];
    parody: BaseTag;
    magazine?: BaseTag;
    circle?: BaseTag;
    event?: BaseTag;
    publisher: BaseTag;
    language: BaseTag;
    direction?: string;
    thumbnail: string;
    pages: number;
    favorites: number;
    description: string;
    tags?: BaseTag[];
}

export interface Game {
    developer: BaseTag;
    publisher: BaseTag;
    language: BaseTag;
    thumbnail: string;
    description: string;
    tags: BaseTag[];
}

export interface Magazine {
    publisher: string;
    coverIllust: string;
    artists: string;
    doujins: DoujinThumb[];
}

export interface DoujinThumb {
    title: BaseTag;
    artist: BaseTag;
    thumbnail: string;
    description: string;
    price: string;
    tags: BaseTag[]; 
}