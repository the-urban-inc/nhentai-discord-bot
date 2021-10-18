import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';
type Root = ReturnType<typeof load>;

interface SearchResult {
    title: string;
    url: string;
    image: string;
}

export class Client {
    public baseURL = 'https://www.jasmr.net';

    private random<T>(a: T[]): T {
        return a[Math.floor(Math.random() * a.length)];
    }

    private async fetch<T>(url: string): Promise<AxiosResponse<T>> {
        try {
            const res = await axios.get(url);
            return res;
        } catch (err) {
            throw err;
        }
    }

    private getURL($: Root): SearchResult {
        return this.random(
            $("[class='videoitem popunder mainitem']")
                .toArray()
                .map(e => {
                    return {
                        title: $(e).find('.videotitlea').text(),
                        url: `${this.baseURL}/${$(e).find('.videotitlea').attr('href')}`,
                        image: `${this.baseURL}/${$(e).find('.videoimg').attr('src')}`
                    };
                })
        );
    }

    private getVideo($: Root): string {
        return $('source').attr('src');
    }

    public async tag(tag: string): Promise<SearchResult> {
        const url = `${this.baseURL}/t?q=+${tag.replace(/ /g, '+')}`;
        const result = await this.fetch<string>(url).then(async res => {
            const $ = load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return this.getURL($);
        });
        return result;
    }

    public async video(url: string): Promise<string> {
        const result = await this.fetch<string>(url).then(async res => {
            const $ = load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return this.getVideo($);
        });
        return result;
    }
}
