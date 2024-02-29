import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';
import { decode } from 'he';
type Root = ReturnType<typeof load>;

export enum Sort {
    Relevance = 'relevance',
    UploadDate = 'upload',
    ViewCount = 'views',
    Rating = 'rating',
}
export interface SearchResult {
    circle: string;
    title: string;
    url: string;
    tags: string[];
    image: string;
    duration: string;
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

    private getVideos($: Root): SearchResult[] {
        return $('.recent-item')
            .toArray()
            .map(e => {
                return {
                    circle: $(e).find('.popular-item-circle').text(),
                    title: $(e).find('.popular-item-title').text(),
                    url: `${this.baseURL}/${$(e).find('.popular-item-title').parent('a').attr('href')}`,
                    tags:
                        ($(e)
                            .find('.popular-item-tag')
                            .toArray()
                            .map(e => decode($(e).text()))) ?? [],
                    image: `${$(e).find('img').attr('src')}`,
                    duration: `${$(e).find('.popular-item-duration').text()}`,
                };
            });
    }

    public async tag(tag: string): Promise<SearchResult[]> {
        const url = `${this.baseURL}/t?q=${tag.replace(/ /g, '+')}`;
        const result = await this.fetch<string>(url).then(async res => {
            const $ = load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return this.getVideos($);
        });
        return result;
    }

    public async search(query: string, page?: number, sort?: string): Promise<SearchResult[]> {
        const url = `${this.baseURL}/s?page=${page}&q=${query.replace(/ /g, '+')}&sort=${sort}&min=none&max=none&age=none&upload=alltime`;
        const result = await this.fetch<string>(url).then(async res => {
            const $ = load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return this.getVideos($);
        });
        return result;
    }

    public async video(url: string): Promise<string> {
        const result = await this.fetch<string>(url).then(async res => {
            const $ = load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            return $('source').attr('src');
        });
        return result;
    }
}
