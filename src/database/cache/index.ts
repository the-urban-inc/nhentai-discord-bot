import { IDoujin, ITag } from '../models';
import mariadb from 'mariadb';
import { PartialGallery, Gallery } from '@api/nhentai';
import moment from 'moment';
import { BANNED_TAGS } from '@constants';

export class Cache {
    pool: mariadb.Pool;

    constructor() {
        this.pool = mariadb.createPool({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            pipelining: true,
        });
    }

    private async doujinBase(id: number) {
        return await this.pool.execute<IDoujin[]>('SELECT * FROM doujinshi WHERE id = ?', [id]);
    }

    private async doujinTagIds(id: number) {
        return await this.pool.execute<{ tag_id: number }[]>(
            'SELECT tag_id FROM doujinshi_tag WHERE doujinshi_id = ?',
            [id]
        );
    }

    private async doujinTags(ids: number[]) {
        return await this.pool.execute<ITag[]>(
            `SELECT tag_id, name, type, count_tag(tag_id) as \`count\` FROM tag WHERE tag_id IN (${ids.join(',')})`
        );
    }

    async getDoujinTags() {
        return await this.pool.execute<{ name: string, type: string }[]>('SELECT name, type FROM tag');
    }

    async getDoujin(id: number): Promise<PartialGallery | null> {
        const rows = await this.doujinBase(id);
        if (!rows.length) return null;
        const {
            media_id,
            title_japanese,
            title_english,
            title_pretty,
            upload_date,
            num_pages,
            num_favourites,
            cover_type,
            thumb_type,
        } = rows[0];
        const tagIds = await this.doujinTagIds(id);
        const tags = await this.doujinTags(tagIds.map(({ tag_id }) => tag_id));
        const reformatTags = tags.map(({ tag_id, name, type, count }) => ({
            id: tag_id,
            name,
            type,
            count,
        }));
        return {
            id,
            media_id,
            title: { japanese: title_japanese, english: title_english, pretty: title_pretty },
            upload_date: upload_date.getTime() / 1000,
            tags: reformatTags,
            num_pages,
            num_favorites: num_favourites,
            images: { cover: { t: cover_type }, thumbnail: { t: thumb_type } },
        };
    }

    async addDoujin(doujin: Gallery) {
        // If the doujin was uploaded within the last 24 hours, don't add it to the cache yet
        if (Date.now() - doujin.upload_date * 1000 < 1000 * 60 * 60 * 24) return;
        let conn: mariadb.PoolConnection;
        try {
            conn = await this.pool.getConnection();
            await this.addDoujinTransaction(conn, doujin);
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.release();
        }
    }

    private async addDoujinTransaction(conn: mariadb.PoolConnection, doujin: Gallery) {
        try {
            await conn.beginTransaction();

            try {
                const { id, media_id, title, upload_date, num_pages, num_favorites, tags, images } =
                    doujin;
                const { japanese, english, pretty } = title;
                await conn.query(
                    'REPLACE INTO doujinshi (id, media_id, title_japanese, title_english, title_pretty, upload_date, num_pages, num_favourites, cover_type, thumb_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        id,
                        media_id,
                        japanese ?? '',
                        english ?? '',
                        pretty ?? '',
                        moment.unix(upload_date).format('YYYY-MM-DD HH:mm:ss'),
                        num_pages ?? 0,
                        num_favorites ?? 0,
                        images.cover.t,
                        images.thumbnail.t,
                    ]
                );
                await conn.batch(
                    'INSERT INTO tag (tag_id, name, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type)',
                    tags.map(tag => [tag.id, tag.name, tag.type])
                );
                await conn.batch(
                    'REPLACE INTO doujinshi_tag (doujinshi_id, tag_id) VALUES (?, ?)',
                    tags.map(({ id: tagId }) => [id, tagId])
                );

                await conn.commit();
            } catch (err) {
                await conn.rollback();
                throw err;
            }
        } catch (err) {
            throw err;
        }

        return Promise.resolve(1);
    }

    async random() {
        const rows = await this.pool.query<IDoujin[]>('SELECT DISTINCT id FROM doujinshi');
        if (!rows.length) return null;
        const { id } = rows[Math.floor(Math.random() * rows.length)];
        return id;
    }

    async safeRandom(banned: boolean, additional: string[] = []) {
        const rows = await this.pool.query(
            'SELECT DISTINCT doujinshi_id FROM doujinshi_tag WHERE tag_id NOT IN (?)',
            [...(banned ? ['0'] : BANNED_TAGS), ...additional]
        );
        if (!rows.length) return null;
        const { doujinshi_id } = rows[Math.floor(Math.random() * rows.length)];
        return doujinshi_id;
    }
}
