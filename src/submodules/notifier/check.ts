import { Logger } from '@structures';
import { Client, Gallery } from '@api/nhentai';
const log = new Logger();
const nh = new Client();

/**
 * Categorize into tags
 * @param from 1st code to check
 * @param to last code to check
 * @param filter tag IDs to filter. Only doujins which has at least one tag in filter will be returned.
 */
export async function check(from: number, to: number, filter: Set<number>) {
    if (to < from) return; // bruh wtf
    let codesToCheck = Array(to - from + 1)
        .fill(0)
        .map((_, i) => from + i);
    return (
        await Promise.all(
            codesToCheck.map(async (code, index) => {
                await new Promise(r => setTimeout(r, index * 5500));
                let out: Gallery = null;
                try {
                    out = (await nh.g(code)).gallery;
                } catch (err) {
                    log.error(err);
                    return;
                }
                if (!out || !out.tags) return;
                let tags = new Map<number, string>();
                for (let tag of out.tags) tags.set(tag.id, tag.name);
                return { out, tags };
            })
        )
    )
        .filter(Boolean)
        .filter(({ tags }) => {
            return [...filter.keys()].some(a => tags.has(a));
        });
}
