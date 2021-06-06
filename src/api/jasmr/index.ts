import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';
type Root = ReturnType<typeof load>;
import qs from 'qs';

interface SearchResult {
    title: string;
    url: string;
}

export class Client {
    public baseURL = 'https://www.jasmr.net';

    private random<T>(a: T[]): T {
        return a[Math.floor(Math.random() * a.length)];
    }

    private async fetch<T>(url: string): Promise<AxiosResponse<T>> {
        const res = await axios.get(url);
        if (res.data.error) throw new Error(res.data.error);
        return res;
    }

    private getURL($: Root): SearchResult {
        return this.random(
            $("[class='outside outsidebig']")
                .toArray()
                .map(e => {
                    return {
                        title: $(e).find('.vidtext').text(),
                        url: `${this.baseURL}/${$(e).find('a').attr('href')}`,
                    };
                })
        );
    }

    private getVideo($: Root): string {
        return $('source').attr('src');
    }

    public async tag(tag: string): Promise<SearchResult> {
        const url = `${this.baseURL}/t?t=+${tag.replace(/ /g, '+')}&s=`;
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
