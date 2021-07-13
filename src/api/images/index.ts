import axios from 'axios';
import NekosClient from 'nekos.life';

export type Endpoint = keyof typeof ACTIONS | keyof typeof SFW_METHODS | keyof typeof NSFW_METHODS;

export class Client {
    public NekosAPI = new NekosClient();
    public nekobotAPI = 'https://nekobot.xyz/api/image?type=';
    public hmtaiAPI = 'https://hmtai.herokuapp.com/v2/';

    private random<T>(a: T[]): T {
        return a[Math.floor(Math.random() * a.length)];
    }

    private isURL(url: string): boolean {
        const PROTOCOL_AND_DOMAIN_RE = /^(?:\w+:)?\/\/(\S+)$/;
        const LOCALHOST_DOMAIN_RE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
        const NON_LOCALHOST_DOMAIN_RE = /^[^\s\.]+\.\S{2,}$/;
        if (typeof url !== 'string') return false;
        const match = url.match(PROTOCOL_AND_DOMAIN_RE);
        if (!match) return false;
        const everythingAfterProtocol = match[1];
        if (!everythingAfterProtocol) return false;
        if (
            LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol) ||
            NON_LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol)
        )
            return true;
        return false;
    }

    public async fetch(query: Endpoint): Promise<string> {
        const urls: string[] = [];
        for await (const method of [ACTIONS, SFW_METHODS, NSFW_METHODS]) {
            if (method[query]?.nekoslife) {
                const q = this.random(method[query].nekoslife) as keyof typeof NekosClient;
                try {
                    const url = (await this.NekosAPI[query in NSFW_METHODS ? 'nsfw' : 'sfw'][q]())
                        ?.url;
                    if (this.isURL(url)) urls.push(url);
                } catch (err) {
                    /* ignore */
                }
            }
            if (method[query]?.nekobot) {
                const q = this.random(method[query].nekobot);
                const url = await axios
                    .get(this.nekobotAPI + q)
                    .then(res => res.data.message)
                    .catch(err => {
                        /* ignore */
                    });
                if (this.isURL(url)) urls.push(url);
            }
            if (method[query]?.hmtai) {
                const q = this.random(method[query].hmtai);
                const url = await axios
                    .get(this.hmtaiAPI + q)
                    .then(res => res.data.url)
                    .catch(err => {
                        /* ignore */
                    });
                if (this.isURL(url)) urls.push(url);
            }
        }
        return this.random(urls);
    }
}

export const ACTIONS = {
    tickle: {
        nekoslife: ['tickle'],
    },
    slap: {
        nekoslife: ['slap'],
    },
    poke: {
        nekoslife: ['poke'],
    },
    pat: {
        nekoslife: ['pat'],
    },
    kiss: {
        nekoslife: ['kiss'],
    },
    hug: {
        nekoslife: ['hug'],
    },
    feed: {
        nekoslife: ['feed'],
    },
    cuddle: {
        nekoslife: ['cuddle'],
    },
};

export const SFW_METHODS = {
    avatar: {
        nekoslife: ['avatar'],
    },
    baka: {
        nekoslife: ['baka'],
    },
    foxgirl: {
        nekoslife: ['foxGirl'],
    },
    gah: {
        nekobot: ['gah'],
    },
    gecg: {
        nekoslife: ['gecg'],
    },
    holo: {
        nekoslife: ['holo'],
    },
    jahy: {
        hmtai: ['jahy'],
    },
    kanna: {
        nekobot: ['kanna'],
    },
    kemonomimi: {
        nekoslife: ['kemonomimi'],
    },
    neko: {
        nekoslife: ['neko', 'nekoGif'],
        nekobot: ['neko'],
        hmtai: ['neko'],
    },
    smug: {
        nekoslife: ['smug'],
    },
    waifu: {
        nekoslife: ['waifu'],
    },
    wallpaper: {
        nekoslife: ['wallpaper'],
        hmtai: ['wallpaper', 'mobileWallpaper'],
    },
};

export const NSFW_METHODS = {
    ahegao: {
        hmtai: ['ahegao'],
    },
    anal: {
        nekoslife: ['anal'],
        nekobot: ['hanal'],
    },
    ass: {
        nekobot: ['hass'],
        hmtai: ['ass'],
    },
    avatar: {
        nekoslife: ['avatar'],
    },
    bdsm: {
        hmtai: ['bdsm'],
    },
    blowjob: {
        nekoslife: ['bJ', 'blowJob'],
        hmtai: ['blowjob'],
    },
    boobs: {
        nekoslife: ['boobs', 'tits'],
        nekobot: ['hboobs'],
    },
    cuckold: {
        hmtai: ['cuckold'],
    },
    cum: {
        nekoslife: ['cumsluts', 'cumArts'],
        hmtai: ['cum', 'creampie'],
    },
    elf: {
        hmtai: ['elves'],
    },
    ero: {
        nekoslife: ['ero'],
        hmtai: ['ero'],
    },
    feet: {
        nekoslife: ['feet', 'feetGif', 'eroFeet'],
        hmtai: ['foot'],
    },
    femdom: {
        nekoslife: ['femdom'],
        hmtai: ['femdom'],
    },
    futa: {
        nekoslife: ['futanari'],
    },
    glasses: {
        hmtai: ['glasses'],
    },
    hentai: {
        nekoslife: ['classic', 'randomHentaiGif'],
        nekobot: ['hentai'],
        hmtai: ['hentai', 'gif'],
    },
    holo: {
        nekoslife: ['holo', 'holoEro'],
        nekobot: ['holo'],
    },
    incest: {
        hmtai: ['incest'],
    },
    kemonomimi: {
        nekoslife: ['kemonomimi', 'eroKemonomimi'],
        nekobot: ['kemonomimi'],
    },
    keta: {
        nekoslife: ['keta'],
    },
    kitsune: {
        nekoslife: ['kitsune'],
        nekobot: ['hkitsune'],
    },
    kuni: {
        nekoslife: ['kuni'],
    },
    masturbation: {
        nekoslife: ['girlSolo', 'girlSoloGif'],
        hmtai: ['masturbation'],
    },
    midriff: {
        nekobot: ['hmidriff'],
    },
    neko: {
        nekoslife: ['neko', 'eroNeko', 'nekoGif'],
        nekobot: ['hneko'],
        hmtai: ['nsfwNeko'],
    },
    orgy: {
        hmtai: ['orgy'],
    },
    paizuri: {
        nekobot: ['paizuri'],
        hmtai: ['boobjob'],
    },
    pantsu: {
        hmtai: ['pantsu'],
    },
    public: {
        hmtai: ['public'],
    },
    pussy: {
        nekoslife: ['pussy', 'pussyWankGif', 'pussyArt'],
        hmtai: ['vagina'],
    },
    tentacle: {
        nekobot: ['tentacle'],
        hmtai: ['tentacles'],
    },
    thigh: {
        nekobot: ['hthigh'],
        hmtai: ['thighs'],
    },
    trap: {
        nekoslife: ['trap'],
    },
    uniform: {
        hmtai: ['uniform'],
    },
    wallpaper: {
        hmtai: ['nsfwMobileWallpaper'],
    },
    yaoi: {
        nekobot: ['yaoi'],
    },
    yuri: {
        nekoslife: ['yuri', 'eroYuri', 'lesbian'],
        hmtai: ['yuri'],
    },
    'zettai ryouiki': {
        hmtai: ['zettaiRyouiki'],
    },
};
