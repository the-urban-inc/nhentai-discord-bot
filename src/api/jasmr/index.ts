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
    language: string;
    rating: string;
    circle: string;
    title: string;
    url: string;
    tags: string[];
    image: string;
    duration: string;
    views: string;
    likes: string;
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
        return $('.video-item')
            .toArray()
            .map(e => {
                return {
                    language: $(e).find('.video-item-badge.video-item-language').text().trim(),
                    rating: $(e).find('.video-item-badge.video-item-agerating').text().trim(),
                    circle: $(e).find('.video-item-circle').text().trim(),
                    title: $(e).find('.video-item-title-container').find('a').attr('aria-label').trim(),
                    url: `${this.baseURL}/${$(e).find('.video-item-title-container').find('a').attr('href')}`,
                    tags:
                        ($(e)
                            .find('.video-item-tag')
                            .toArray()
                            .map(e => decode($(e).text()))) ?? [],
                    image: $(e).find('img').attr('src'),
                    duration: $(e).find('.video-item-duration').text().trim(),
                    views: $(e).find('.video-item-clicks').text().trim(),
                    likes: $(e).find('.video-item-likes').text().trim(),
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
        const url = `${this.baseURL}/search?q=${query.replace(/ /g, '+')}&page=${page}&sort=${sort}`;
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

    public async tagList(): Promise<string[]> {
        const url = `${this.baseURL}/categories`;
        const result = await this.fetch<string>(url).then(async res => {
            const $ = load(<string>res.data, {
                decodeEntities: false,
                xmlMode: false,
            });
            let tags: string[] = [];
            for (const e of $('.categories-section.categories-section').toArray()) {
                const rawTagList = $(e).find('.categories-item.button.button-tag').toArray();
                const tagList = rawTagList.map(e => e.attribs['tag']);
                if (tagList.includes('Rape')) continue; // Skip extreme catergory
                tags.push(...tagList);
            }
            return tags;
        });
        return result;
    }
}
