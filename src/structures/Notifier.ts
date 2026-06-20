import { Client } from './Client';
import { User, WatchModel } from '@database/models';
import { Gallery } from '@api/nhentai';

export class Notifier {
    public client: Client;
    public current: NodeJS.Timeout;
    private last: number;
    private interval = 300 * 1000;

    constructor(client: Client) {
        this.client = client;
    }

    private async getCode() {
        return +(await this.client.nhentai.home()).result[0].id;
    }

    async watches() {
        const records = await WatchModel.find({}).select('id').exec();
        return new Set(records.map(a => a.id));
    }

    async check(from: number, to: number, filter: Set<number>) {
        if (to < from) return;
        const pages: Gallery[] = [];
        let last = 0,
            page = 1;
        do {
            const cur = (await this.client.nhentai.home(page)).result;
            last = +cur[24].id;
            pages.push(...cur);
            page++;
        } while (from < last);
        return pages.filter(
            ({ id, tags }) => from <= +id && +id <= to && tags.some(t => filter.has(t.id))
        );
    }

    async dispatch(galleries: Gallery[]) {
        const ids = await WatchModel.find({});
        const cache = new Map<string, Set<number>>();
        for (const { id: tagId, user } of ids) {
            const targets = galleries.filter(g => g.tags.some(t => t.id === tagId));
            if (!targets.length) continue;
            for (const userId of user) {
                let duser;
                try {
                    duser = await this.client.users.fetch(userId);
                }
                catch (err) {
                    this.client.logger.warn(`[NOTIFIER] Couldn't fetch user ${userId}`, err);
                    continue;
                }
                if (!duser) continue;
                for (const doujin of targets) {
                    const id = doujin.id;
                    if (!cache.has(userId)) cache.set(userId, new Set<number>());
                    if (cache.get(userId)!.has(+id)) continue;
                    cache.get(userId)!.add(+id);
                    try {
                        let dbUser = await User.findOne({ userID: userId });
                        if (!dbUser) {
                            dbUser = await new User({
                                userID: userId,
                                blacklists: [],
                                language: {
                                    preferred: [],
                                    query: false,
                                    follow: false,
                                },
                            }).save();
                        }
                        if (
                            dbUser.language?.follow === true &&
                            !doujin.tags.some(tag =>
                                dbUser.language?.preferred
                                    .map(x => x.id)
                                    .includes(String(tag.id))
                            )
                        ) {
                            continue;
                        }
                        const tags = await WatchModel.find({ user: userId });
                        const info = this.client.embeds.displayGalleryInfo(
                            doujin,
                            true,
                            dbUser.blacklists,
                            tags.map(t => t.id)
                        ).info;
                        const m = await duser.send({
                            content:
                                'A new doujin was released!\nNote: Tags you followed are underlined.',
                            embeds: [info],
                        });
                        this.client.logger.info(
                            `[NOTIFIER] Notified user ${duser.username} (ID: ${duser.id}) of doujin ${id}. Message ID : ${m.id}`
                        );
                    }
                    catch (err) {
                        this.client.logger.warn(
                            `[NOTIFIER] Couldn't notify user ${duser.username} (ID: ${duser.id}) of doujin ${id}`,
                            err
                        );
                    }
                }
            }
        }
    }

    async start() {
        this.last = await this.getCode();
        if (isNaN(this.last)) {
            this.client.logger.error(
                `Parsing error: couldn't find the latest doujin code. Please check the scraping logic. Nothing is changed after this incident.`
            );
            return;
        }
        this.client.logger.info(`[NOTIFIER] The latest doujin code is ${this.last}. Caching.`);
        const watches = await this.watches();
        if (watches.size === 0) {
            this.client.logger.warn(`[NOTIFIER] No tags to be watched for. I will not start.`);
        } else {
            let running = false;
            this.current = setInterval(async () => {
                if (running) {
                    this.client.logger.warn(
                        `[NOTIFIER] Previous check is still running; skipping this tick.`
                    );
                    return;
                }
                running = true;
                try {
                    const _ = await this.getCode();
                    if (isNaN(_)) {
                        this.client.logger.warn(
                            `[NOTIFIER] Couldn't parse the latest code this tick; skipping.`
                        );
                        return;
                    }
                    if (this.last < _) {
                        this.client.logger.info(
                            `[NOTIFIER] The latest code is now ${_}, from the last of ${this.last}.`
                        );
                        this.client.logger.info(`[NOTIFIER] Dispatching event.`);
                        const out = await this.check(this.last + 1, _, await this.watches());
                        this.last = _;
                        await this.dispatch(out ?? []);
                    }
                    else {
                        this.client.logger.info(`[NOTIFIER] No new doujin.`);
                        this.last = _;
                    }
                }
                catch (err) {
                    this.client.logger.error(err);
                }
                finally {
                    running = false;
                }
            }, this.interval);
            this.client.logger.info(
                `[NOTIFIER] Started watcher. Every ${this.interval}ms there will be a check.`
            );
        }
    }
}
