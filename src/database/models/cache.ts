import { TagType } from '@api/nhentai';

export interface IDoujin {
    id: number;
    media_id: string;
    upload_date: Date;
    num_favourites: number;
    num_pages: number;
    title_japanese: string;
    title_pretty: string;
    title_english: string;
    cover_type: 'j' | 'p' | 'g' | 'n';
    thumb_type: 'j' | 'p' | 'g' | 'n';
}

export interface ITag {
    tag_id: number;
    name: string;
    type: TagType;
    count: number;
}