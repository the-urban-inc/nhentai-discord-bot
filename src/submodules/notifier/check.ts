import { nhentaiClient } from '@nhentai/struct/nhentai/index';

const nh = new nhentaiClient();

/**
 * Categorize into tags
 * @param from 1st code to check
 * @param to last code to check
 */
export async function check(from: number, to: number, filter: Set<number>) {
    if (to < from) return; // bruh wtf
    return (
        await Promise.all(
            Array(to - from + 1)
                .fill(0)
                .map((_, i) => from + i)
                .map(async (c, i) => {
                    await new Promise(r => setTimeout(r, i * 5500));
                    const out = await nh.g(c.toString());
                    if (out.details.error) return;
                    let tags = new Map<number, string>();
                    out.details.tags.forEach(a => tags.set(a.id, a.name));
                    return { out, tags };
                })
        )
    )
        .filter(Boolean)
        .filter(({ tags }) => {
            return [...filter.keys()].some(a => tags.has(a));
        });
}
