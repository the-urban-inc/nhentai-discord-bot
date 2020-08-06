interface Page {
    t: string,
    w: number,
    h: number
}

export interface Tag {
    id: number,
    type: string,
    name: string,
    url: string,
    count: number
}

export class DoujinDetails {
    id: number
    media_id: string
    title: {
        english: string,
        japanese: string,
        pretty: string
    }
    images: {
        pages: Array<Page>,
        cover: Page,
        thumbnail: Page,
        scanlator: string,
        upload_date: number
    }
    tags: Array<Tag>
    num_pages: number
    num_favorites: number
}

export interface DoujinThumbnail {
    id: string,
    title: string,
    language: string,
    thumbnail: {
        s: string,
        w: string,
        h: string
    }
}

interface DoujinCommentUser {
    id: number,
    username: string,
    slug: string,
    avatar_url: string,
    is_superuser: boolean,
    is_staff: boolean
}

export interface DoujinComment {
    id: number,
    gallery_id: number,
    poster: Array<DoujinCommentUser>,
    post_date: number,
    body: string
}