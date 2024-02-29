import { IDoujin, ITag } from '../models';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { Client as NhentaiAPI, Gallery } from '@api/nhentai';
import moment from 'moment';
import { BANNED_TAGS } from '@constants';

export class Cache {
    connection: mysql.Pool;
    api: NhentaiAPI;

    constructor() {
        this.connection = mysql.createPool({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
        this.api = null;
    }

    async doujinBase(id: number) {
        return await this.connection.query<IDoujin[]>('SELECT * FROM doujinshi WHERE id = ?', [id]);
    }

    async doujinTagIds(id: number) {
        return await this.connection.query<RowDataPacket[]>('SELECT tag_id FROM doujinshi_tag WHERE doujinshi_id = ?', [id]);
    }

    async doujinTags(ids: number[]) {
        return await this.connection.query<ITag[]>('SELECT * FROM tags WHERE id IN (?)', [ids]);
    }

    async getDoujin(id: number) {
        const [rows] = await this.doujinBase(id);
        if (!rows.length) {
            if (!this.api) this.api = new NhentaiAPI();
            const { gallery } = (await this.api.g(id));
            if (!gallery) return null;
            await this.addDoujin(gallery);
            const { media_id, title: { japanese, english, pretty }, upload_date, tags, num_pages } = gallery;
            return { id, media_id, title: { japanese, english, pretty }, upload_date, tags, num_pages };
        }
        const [{ media_id, title_japanese, title_english, title_pretty, upload_date, pages }] = rows;
        const [tagIds] = await this.doujinTagIds(id);
        const [tags] = await this.doujinTags(tagIds.map(({ tag_id }) => tag_id));
        return { id, media_id, title: { japanese: title_japanese, english: title_english, pretty: title_pretty }, upload_date, tags, num_pages: pages };
    }

    async addDoujin(doujin: Gallery) {
        const { id, media_id, title, upload_date, num_pages, tags } = doujin;
        const { japanese, english, pretty } = title;
        await this.connection.query('INSERT INTO doujinshi (id, media_id, title_japanese, title_english, title_pretty, upload_date, pages) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, media_id, japanese, english, pretty, moment.unix(upload_date).format('YYYY-MM-DD HH:mm:ss'), num_pages]);
        const tagIds = tags.map(tag => tag.id);
        await this.connection.query('INSERT INTO doujinshi_tag (doujinshi_id, tag_id) VALUES ?', [tagIds.map(tagId => [id, tagId])]);
        await this.connection.query('INSERT INTO tags (id, name, type, count) VALUES ?', [tags.map(tag => [tag.id, tag.name, tag.type, tag.count])]);
    }

    async random() {
        const [rows] = await this.connection.query<IDoujin[]>('SELECT DISTINCT id FROM doujinshi');
        if (!rows.length) return null;
        const { id } = rows[Math.floor(Math.random() * rows.length)];
        return id;
    }

    async safeRandom(banned: boolean, additional: string[] = []) {
        const [rows] = await this.connection.query<RowDataPacket[]>('SELECT DISTINCT doujinshi_id FROM doujinshi_tag WHERE tag_id NOT IN (?)', [[...(banned ? ['0'] : BANNED_TAGS), ...additional]]);
        if (!rows.length) return null;
        const { doujinshi_id } = rows[Math.floor(Math.random() * rows.length)];
        return doujinshi_id;
    }
}