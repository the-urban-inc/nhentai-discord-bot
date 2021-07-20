import { Client } from './Client';
import { User, WatchModel } from '@database/models';
import { Client as NHClient, Gallery } from '@api/nhentai';
const nh = new NHClient();

export class Notifier {
    public client: Client;
    public current: NodeJS.Timeout;
    private last: number;
    private interval = 300 * 1000;

    constructor(client: Client) {
        this.client = client;
    }

    private async getCode() {
        return +(await nh.home()).result[0].id;
    }

    async watches() {
        let records = await WatchModel.find({}).select('id').exec();
        return new Set(records.map(a => a.id));
    }

    async check(from: number, to: number, filter: Set<number>) {
        if (to < from) return;
        const pages: Gallery[] = [];
        let last = 0,
            page = 1;
        do {
            const cur = (await nh.home(page)).result;
            last = +cur[24].id;
            pages.push(...cur);
            page++;
        } while (from < last);
        return pages.filter(
            ({ id, tags }) => from <= +id && +id <= to && tags.some(t => filter.has(t.id))
        );
    }

    async dispatch(galleries: Gallery[]) {
        let ids = await WatchModel.find({}).exec();
        let cache = new Map<string, Set<number>>();
        ids.forEach(({ id: tagId, user }) => {
            const targets = galleries.filter(g => g.tags.some(t => t.id === tagId));
            user.forEach(async userId => {
                const duser = await this.client.users.fetch(userId);
                if (!duser) return;
                targets.forEach(async doujin => {
                    const id = doujin.id;
                    if (!cache.has(userId)) cache.set(userId, new Set<number>());
                    if (cache.get(userId).has(+id)) return;
                    cache.get(userId).add(+id);
                    let user = await User.findOne({ userID: userId }).exec();
                    if (!user) {
                        user = await new User({
                            blacklists: [],
                        }).save();
                    }
                    const tags = await WatchModel.find({ user: userId }).exec();
                    const info = this.client.embeds.displayGalleryInfo(
                        doujin,
                        true,
                        user.blacklists,
                        tags.map(t => t.id)
                    ).info;
                    duser
                        .send({
                            content:
                                'A new doujin was released!\nNote: Tags you followed are underlined.',
                            embeds: [info],
                        })
                        .then(m =>
                            this.client.logger.info(
                                `[NOTIFIER] Notified user ${duser.username} (ID: ${duser.id}) of doujin ${id}. Message ID : ${m.id}`
                            )
                        )
                        .catch(err =>
                            this.client.logger.warn(
                                `[NOTIFIER] Couldn't notifier user ${duser.username} (ID: ${duser.id})`
                            )
                        );
                });
            });
        });
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
            this.current = setInterval(async () => {
                let _ = await this.getCode();
                if (this.last < _) {
                    this.client.logger.info(
                        `[NOTIFIER] The latest code is now ${_}, from the last of ${this.last}.`
                    );
                    this.client.logger.info(`[NOTIFIER] Dispatching event.`);
                    let out = await this.check(this.last + 1, _, await this.watches());
                    this.last = _;
                    this.dispatch(out);
                } else this.client.logger.info(`[NOTIFIER] No new doujin.`);
                this.last = _;
            }, this.interval);
            this.client.logger.info(
                `[NOTIFIER] Started watcher. Every ${this.interval}ms there will be a check.`
            );
        }
    }
}
