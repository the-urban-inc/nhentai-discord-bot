import { BaseTag, Doujin, Game, DoujinThumb } from './lib/structures';
import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';

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

    private async fetch<T>(path: string): Promise<AxiosResponse<T>> {
        const url = `${this.baseURL}${path}`;
        const res = await axios.get(url);
        if (res.data.error) throw new Error(res.data.error);
        return res;
    }

    private async handleDoujin(res: AxiosResponse) {
        const $ = load(<string>res.data, {
            decodeEntities: false,
            xmlMode: false,
        });
        const result = <Doujin>{};
        const left = $('.row-left')
            .toArray()
            .map((e, i) => $(e).text());
        const right: (string | BaseTag | BaseTag[])[] = $('.row-right')
            .toArray()
            .map((e, i) =>
                $(e).find('a').length === 0
                    ? $(e).text().trim()
                    : $(e).find('a').length === 1
                    ? { name: $(e).text().trim(), href: $(e).find('a').attr('href') }
                    : $(e)
                          .find('a')
                          .get()
                          .map((e, i) => {
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
        result.title = $('title').text();
        result.thumbnail = 'https:' + $('.content-poster.tablet-50').attr('src');
        return result;
    }

    public async doujin(path: string): Promise<Doujin> {
        const result = await this.fetch<Doujin>(path).then(res => this.handleDoujin(res));
        return result;
    }
}
