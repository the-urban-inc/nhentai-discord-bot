import { RowDataPacket } from 'mysql2';

export interface IDoujin extends RowDataPacket {
    id: number;
    media_id: string;
    pages: number;
    title_japanese: string;
    title_pretty: string;
    title_english: string;
    upload_date: Date;
}

export interface ITag extends RowDataPacket {
    id: number;
    name: string;
    type: string;
    count: number;
}