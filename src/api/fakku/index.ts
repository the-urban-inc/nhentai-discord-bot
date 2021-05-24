import { BaseTag, Doujin, Magazine, Game, DoujinThumb } from './lib/structures';
import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';
import Fuse from 'fuse.js';

const _ = {
    Book: 'book',
    Artist: 'artist',
    Parody: 'parody',
    Magazine: 'magazine',
    Circle: 'circle',
    Event: 'event',
    Publisher: 'publisher',
    Language: 'language',
    Direction: 'direction',
    Pages: 'pages',
    Favorites: 'favorites',
    Description: 'description',
    Tags: 'tags',
};

export class Client {
    public baseURL = 'https://fakku.net';
    private magazineList: Array<{ title: string; url: string; image: string }>;

    public async setup(): Promise<void> {
        this.magazineList = [];
        return new Promise(async (resolve, reject) => {
            for (let i = 1; i <= 7; i++) {
                await this.fetchMagazinePage(i);
                this.magazineList = this.magazineList.filter(({ title }, i, a) => title.length);
            }
            resolve();
        });
    }

    private async fetch<T>(path: string): Promise<AxiosResponse<T>> {
        const url = `${this.baseURL}${path}`;
        const res = await axios.get(url);
        if (res.data.error) throw new Error(res.data.error);
        return res;
    }

    private async handleSingleMagazine(res: AxiosResponse): Promise<Magazine> {
        const $ = load(<string>res.data, {
            decodeEntities: false,
            xmlMode: false,
        });
        const comicDescription = $('.attribute-description.text-left')?.text() ?? '';
        const regex = /(.*)Cover Illustration:(.*)Artists:(.*)/;
        const match = comicDescription.match(regex) ?? ['', '', '', ''];
        const publisher = match[1].trim() ?? '';
        const coverIllust = match[2].trim() ?? '';
        const artists = match[3].trim() ?? '';
        const doujins = $('.content-row.border-radius.content-comic')
            ?.toArray()
            ?.map(e => {
                const title = {
                    name: $(e).find('h2').find('a').attr('title').trim(),
                    href: $(e).find('h2').find('a').attr('href'),
                };
                const artist = {
                    name: $(e).find("[class='row-right']").find('a').text().trim(),
                    href: $(e).find("[class='row-right']").find('a').attr('href'),
                };
                const thumbnail = $(e).find('img.cover').attr('src');
                const description = $(e).find('.row-right.description').text().trim();
                const price = $(e).find('span.product-price').text().trim();
                const tags = $(e)
                    .find('.row-right.tags')
                    .find('a')
                    .get()
                    .map(e => {
                        return {
                            name: $(e).text().trim(),
                            href: $(e).attr('href'),
                        };
                    });
                return { title, artist, thumbnail, description, price, tags };
            });
        return { publisher, coverIllust, artists, doujins };
    }

    public async fetchSingleMagazine(path: string): Promise<Magazine> {
        return await this.fetch(path).then(res => this.handleSingleMagazine(res));
    }

    private async handleMagazinePage(res: AxiosResponse): Promise<void> {
        const $ = load(<string>res.data, {
            decodeEntities: false,
            xmlMode: false,
        });
        const data = $('a.cover')
            .toArray()
            .map(e => {
                return {
                    title: $(e).attr('title').trim(),
                    url: $(e).attr('href'),
                    image: $(e).find('img').attr('src'),
                };
            });
        this.magazineList = this.magazineList.concat(data);
    }

    private async fetchMagazinePage(page: number): Promise<void> {
        const url = `/hentai/magazines/page/${page}`;
        await this.fetch(url).then(res => this.handleMagazinePage(res));
    }

    public findMagazine(title: string) {
        return new Fuse(this.magazineList, {
            includeScore: true,
            threshold: 0.3,
            keys: ['title'],
        }).search(title);
    }

    private async handleDoujin(res: AxiosResponse): Promise<Doujin> {
        const $ = load(<string>res.data, {
            decodeEntities: false,
            xmlMode: false,
        });
        const result = <Doujin>{};
        const price = $('.content-left').find('.price').text().trim();
        if (price && price.length) result.price = price;
        const left = $('.row-left')
            .toArray()
            .map(e => $(e).text());
        const right: (string | BaseTag | BaseTag[])[] = $('.row-right')
            .toArray()
            .map(e =>
                $(e).find('a').length === 0
                    ? $(e).text().trim()
                    : $(e).find('a').length === 1
                    ? { name: $(e).text().trim(), href: $(e).find('a').attr('href') }
                    : $(e)
                          .find('a')
                          .get()
                          .map(e => {
                              return {
                                  name: $(e).text().trim(),
                                  href: $(e).attr('href'),
                              };
                          })
            );
        left.forEach((e, i) => {
            result[_[e]] = right[i];
        });
        if (result.tags) result.tags.pop();
        result.title = $('h1').text().trim();
        result.thumbnail = 'https:' + $('.content-poster.tablet-50').attr('src');
        return result;
    }

    public async doujin(path: string): Promise<Doujin> {
        const result = await this.fetch<Doujin>(path).then(res => this.handleDoujin(res));
        return result;
    }
}
