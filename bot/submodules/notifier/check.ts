import ax from 'axios';
import { componentLog } from '@notifier/utils/logger';

const log = new componentLog('Notifier/Execution');

/**
 * Categorize into tags
 * @param from 1st code to check
 * @param to last code to check
 */
export async function check (from : number, to : number, filter: Set<number>) {
    if (to < from) return;  // bruh wtf
    return (await Promise.all(
        Array(to - from + 1).fill(0).map((_, i) => from + i).map(async c => {
            let url = `https://nhentai.net/api/gallery/${c}`;
            let _ = await ax.get(url, { validateStatus: () => true });
            if (_.status !== 200) {
                log.error(`Fetching ${url} failed : status was ${_.status}`);
                return;
            }
            let out = _.data as {
                id: number;
                media_id: string;
                title: { english: string, japanese: string, pretty: string };
                tags: {
                    id: number; type: string; name: string; count: number;
                }[]
            };
            let tags = new Map<number, string>();
            out.tags.forEach(a => tags.set(a.id, a.name));
            return { ...out, tags }
        })
    ))
    .filter(Boolean)
    .filter(({ tags }) => {
        return [...filter.keys()].some(a => tags.has(a))
    })
}