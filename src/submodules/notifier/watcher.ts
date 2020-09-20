import interval from 'set-interval';
import { EventEmitter } from 'events';
import cc from 'cheerio';
import ax from 'axios';
import { check } from './check';
import { dispatch } from './dispatch';
import log from '@nhentai/utils/logger';

export default class Watcher extends EventEmitter {
    private watch = new Set<number>();
    public working = false;
    private ints = interval;
    private key = 'watcher';
    private last: number;

    private interval = 1800 * 1000;

    async setWatch(s: Set<number>) {
        this.watch = s;
        log.info(`I am now configured to watch ${s.size} tag(s).`);
        if (this.working) await this.stop().then(() => this.start());
        return this;
    }

    async stop() {
        this.ints.stop(this.key);
        this.working = false;
        log.warn(`I am stopping, possibly due to changes in the number of watching targets.`);
        log.info(`The last doujin code I checked was ${this.last}.`);
        return this;
    }

    private async getCode() {
        let _ = (await ax.get('https://nhentai.net/')).data;
        return +/(\d)+/g.exec(cc.load(_)(`div.gallery > a.cover`).slice(5).attr('href'))[0];
    }

    async start() {
        // check the latest doujin code
        this.last = await this.getCode();
        if (isNaN(this.last)) {
            log.error(
                `Parsing error : couldn't find the latest doujin code.` +
                    `\Please check the scraping logic. Nothing is changed after this incident.`
            );
            return this;
        }

        log.info(`The latest doujin code is ${this.last}. Caching.`);
        if (this.watch.size === 0) {
            log.warn(`No tags to be watched for. I will not start.`);
        } else {
            this.ints.start(
                async () => {
                    let _ = await this.getCode();
                    if (this.last < _) {
                        log.info(`The latest code is now ${_}, from the last of ${this.last}.`);
                        log.info(`Dispatching event.`);
                        let out = await check(this.last + 1, _, this.watch);
                        this.last = _;
                        dispatch(out);
                    } else log.info(`No new doujin.`);
                    this.last = _;
                    // TODO : dispatch events to another module to check
                },
                this.interval,
                this.key
            );
            // marking state to be true
            this.working = true;
            log.info(`Started watcher. Every ${this.interval}ms there will be a check.`);
        }
        return this;
    }
}
