import interval from 'set-interval';
import { componentLog } from '@notifier/utils/logger';
import { EventEmitter } from "events";
import cc from 'cheerio';
import ax from 'axios';
import { check } from './check';
import { dispatch } from './dispatch';

export default class Watcher extends EventEmitter {
    private watch = new Set<number>();
    public working = false;
    private ints = interval;
    private key = 'watcher';
    private last : number;
    private log = new componentLog('Notifier/Watcher');
    
    private interval = 5000;

    async setWatch(s : Set<number>) {
        this.watch = s;
        this.log.info(`I am now configured to watch ${s.size} tag(s).`)
        if (this.working)
            await this.stop().then(() => this.start());
        return this
    }

    async stop() {
        this.ints.stop(this.key);
        this.working = false;
        this.log.warning(`I am stopping, possibly due to changes in the number of watching targets.`);
        this.log.info(`The last doujin code I checked was ${this.last}.`);
        return this;
    }

    private async getCode() {
        let _ = (await ax.get('https://nhentai.net/')).data;
        return +/(\d)+/g.exec(cc.load(_)(`div.gallery > a.cover`).attr('href'))[0];
    }

    async start() {
        // check the latest doujin code
        this.last = await this.getCode();
        if (isNaN(this.last)) {
            this.log.error(
                `Parsing error : couldn't find the latest doujin code.`
                + `\Please check the scraping logic. Nothing is changed after this incident.`
            )
            return this;
        }

        this.log.info(`The latest doujin code is ${this.last}. Caching.`)
        if (this.watch.size === 0) {
            this.log.warning(`No tags to be watched for. I will not start.`)
        } else {
            this.ints.start(
                async () => {
                    let _ = await this.getCode();
                    if (this.last < _) {
                        this.log.info(`The latest code is now ${_}, from the last of ${this.last}.`);
                        this.log.info(`Dispatching event.`)
                        let out = await check(this.last + 1, _, this.watch);
                        this.last = _;
                        dispatch(out);
                    }
                    else
                        this.log.info(`No new doujin.`)
                    this.last = _;
                    // TODO : dispatch events to another module to check
                },
                this.interval, this.key
            )
            // marking state to be true
            this.working = true;
            this.log.success(`Started watcher. Every ${this.interval}ms there will be a check.`)
        };
        return this;
    }
}