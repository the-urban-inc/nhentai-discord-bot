import interval from 'set-interval';
import { EventEmitter } from 'events';
import { check } from './check';
import { dispatch } from './dispatch';
import { Logger } from '@structures';
const log = new Logger();
import { Client } from '@api/nhentai';
const nh = new Client();

export default class Watcher extends EventEmitter {
    private watch = new Set<number>();
    public working = false;
    private ints = interval;
    private key = 'watcher';
    private last: number;

    private interval = 300 * 1000;

    async setWatch(s: Set<number>) {
        this.watch = s;
        log.info(`[NOTIFIER] I am now configured to watch ${s.size} tag(s).`);
        if (this.working) await this.stop().then(() => this.start());
        return this;
    }

    async stop() {
        this.ints?.clear?.(this.key);
        this.working = false;
        log.warn(`[NOTIFIER] I am stopping, possibly due to changes in the number of watching targets.`);
        log.info(`[NOTIFIER] The last doujin code I checked was ${this.last}.`);
        return this;
    }

    private async getCode() {
        return +(await nh.home()).result[0].id;
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
        log.info(`[NOTIFIER] The latest doujin code is ${this.last}. Caching.`);
        if (this.watch.size === 0) {
            log.warn(`[NOTIFIER] No tags to be watched for. I will not start.`);
        } else {
            this.ints.start(
                async () => {
                    let _ = await this.getCode();
                    if (this.last < _) {
                        log.info(`[NOTIFIER] The latest code is now ${_}, from the last of ${this.last}.`);
                        log.info(`[NOTIFIER] Dispatching event.`);
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
            log.info(`[NOTIFIER] Started watcher. Every ${this.interval}ms there will be a check.`);
        }
        return this;
    }
}
