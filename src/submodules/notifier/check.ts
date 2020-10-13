import log from '@nhentai/utils/logger';
import { NhentaiAPI } from '@nhentai/struct/nhentai/index';

const nh = new NhentaiAPI();

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
                let out = null;
                try {
                    out = await nh.g(code.toString());
                } catch (err) {
                    log.error(err);
                    return;
                }
                if (!out || !out.details || !out.details.tags) return;
                let tags = new Map<number, string>();
                for (let tag of out.details.tags) tags.set(tag.id, tag.name);
                return { out, tags };
            })
        )
    )
        .filter(Boolean)
        .filter(({ tags }) => {
            return [...filter.keys()].some(a => tags.has(a));
        });
}
