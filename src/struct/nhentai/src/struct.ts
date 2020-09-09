interface Page {
    t: string;
    w: number;
    h: number;
}

export interface Tag {
    id: number;
    type: string;
    name: string;
    url: string;
    count: number;
}

export class DoujinDetails {
    id: number;
    media_id: string;
    title: {
        english: string;
        japanese: string;
        pretty: string;
    };
    images: {
        pages: Page[];
        cover: Page;
        thumbnail: Page;
        scanlator: string;
        upload_date: number;
    };
    scanlator: string;
    upload_date: number;
    tags: Tag[];
    num_pages: number;
    num_favorites: number;
}

export interface DoujinThumbnail {
    id: string;
    title: string;
    language: string;
    dataTags: string[];
    thumbnail: {
        s: string;
        w: string;
        h: string;
    };
}

export interface DoujinList {
    tagId: number | null;
    results: DoujinThumbnail[];
    num_pages: number;
    num_results: number;
}

interface DoujinCommentUser {
    id: number;
    username: string;
    slug: string;
    avatar_url: string;
    is_superuser: boolean;
    is_staff: boolean;
}

export interface DoujinComment {
    id: number;
    gallery_id: number;
    poster: DoujinCommentUser;
    post_date: number;
    body: string;
}

const TYPE = {
    j: 'jpg',
    p: 'png',
    g: 'gif',
};

export class Gallery {
    details: DoujinDetails;
    related?: DoujinThumbnail[];
    comments?: DoujinComment[];

    constructor(details: DoujinDetails, related?: DoujinThumbnail[], comments?: DoujinComment[]) {
        this.details = details;
        this.related = related;
        this.comments = comments;
    }

    getPages(baseURL = 'https://i.nhentai.net') {
        let pages: string[] = [];
        this.details.images.pages.forEach((page, i) => {
            pages.push(
                `${baseURL}/galleries/${this.details.media_id}/${i + 1}.${
                    TYPE[page.t as keyof typeof TYPE]
                }`
            );
        });
        return pages;
    }

    getPagesThumbnail(baseURL = 'https://t.nhentai.net') {
        let pages: string[] = [];
        this.details.images.pages.forEach((page, i) => {
            pages.push(
                `${baseURL}/galleries/${this.details.media_id}/${i + 1}t.${
                    TYPE[page.t as keyof typeof TYPE]
                }`
            );
        });
        return pages;
    }

    getCover(baseURL = 'https://t.nhentai.net') {
        return `${baseURL}/galleries/${this.details.media_id}/cover.${
            TYPE[this.details.images.cover.t as keyof typeof TYPE]
        }`;
    }

    getCoverThumbnail(baseURL = 'https://t.nhentai.net') {
        return `${baseURL}/galleries/${this.details.media_id}/thumb.${
            TYPE[this.details.images.cover.t as keyof typeof TYPE]
        }`;
    }
}
