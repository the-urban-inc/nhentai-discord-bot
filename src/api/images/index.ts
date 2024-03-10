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

    public async fetch(type: 'actions' | 'sfw' | 'nsfw', query: Endpoint): Promise<string> {
        const urls: string[] = [];
        let method: typeof ACTIONS | typeof SFW_METHODS | typeof NSFW_METHODS;
        switch (type) {
            case 'actions':
                method = ACTIONS;
                break;
            case 'sfw':
                method = SFW_METHODS;
                break;
            case 'nsfw':
                method = NSFW_METHODS;
            default:
                break;
        }
        if (method[query]?.nekoslife) {
            const q = this.random(method[query].nekoslife) as keyof typeof NekosClient;
            try {
                const url = (await this.NekosAPI[q]())
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
        return this.random(urls);
    }
}

export const ACTIONS = {
    bite: {
        hmtai: ['bite'],
    },
    blush: {
        hmtai: ['blush'],
    },
    boop: {
        hmtai: ['boop'],
    },
    bonk: {
        hmtai: ['bonk'],
    },
    bully: {
        hmtai: ['bully'],
    },
    cry: {
        hmtai: ['cry'],
    },
    cuddle: {
        nekoslife: ['cuddle'],
        hmtai: ['cuddle'],
    },
    dance: {
        hmtai: ['dance'],
    },
    depression: {
        hmtai: ['depression'],
    },
    feed: {
        nekoslife: ['feed'],
        hmtai: ['feed'],
    },
    glomp: {
        hmtai: ['glomp'],
    },
    handhold: {
        hmtai: ['hold'],
    },
    highfive: {
        hmtai: ['five'],
    },
    hug: {
        nekoslife: ['hug'],
        hmtai: ['hug'],
    },
    kick: {
        hmtai: ['kick'],
    },
    kill: {
        hmtai: ['kill'],
    },
    kiss: {
        nekoslife: ['kiss'],
        hmtai: ['kiss'],
    },
    lick: {
        hmtai: ['lick'],
    },
    like: {
        hmtai: ['like'],
    },
    nom: {
        hmtai: ['nom'],
    },
    nosebleed: {
        hmtai: ['nosebleed'],
    },
    pat: {
        nekoslife: ['pat'],
        hmtai: ['pat'],
    },
    poke: {
        nekoslife: ['poke'],
        hmtai: ['poke'],
    },
    punch: {
        hmtai: ['punch'],
    },
    slap: {
        nekoslife: ['slap'],
        hmtai: ['slap'],
    },
    sleep: {
        hmtai: ['sleep'],
    },
    smile: {
        hmtai: ['smile'],
    },
    smug: {
        nekoslife: ['smug'],
        hmtai: ['smug'],
    },
    threaten: {
        hmtai: ['threaten'],
    },
    throw: {
        hmtai: ['throw'],
    },
    tickle: {
        nekoslife: ['tickle'],
        hmtai: ['tickle'],
    },
    wave: {
        hmtai: ['wave'],
    },
    wink: {
        hmtai: ['wink'],
    },
};

export const SFW_METHODS = {
    avatar: {
        nekoslife: ['avatar'],
    },
    coffee: {
        hmtai: ['coffee'],
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
    jahy: {
        hmtai: ['jahy_arts'],
    },
    kanna: {
        nekobot: ['kanna'],
    },
    kemonomimi: {
        nekoslife: ['kemonomimi'],
    },
    neko: {
        hmtai: ['neko_arts'],
        nekobot: ['neko'],
        nekoslife: ['neko', 'nekoGif'],
    },
    waifu: {
        nekoslife: ['waifu'],
    },
    wallpaper: {
        hmtai: ['wallpaper', 'mobileWallpaper'],
        nekoslife: ['wallpaper'],
    },
};

export const NSFW_METHODS = {
    ahegao: {
        hmtai: ['ahegao'],
    },
    anal: {
        nekobot: ['hanal'],
    },
    ass: {
        nekobot: ['hass'],
        hmtai: ['ass'],
    },
    bdsm: {
        hmtai: ['bdsm'],
    },
    blowjob: {
        hmtai: ['blowjob'],
    },
    boobs: {
        nekobot: ['hboobs'],
    },
    cuckold: {
        hmtai: ['cuckold'],
    },
    cum: {
        hmtai: ['cum', 'creampie'],
    },
    elf: {
        hmtai: ['elves'],
    },
    ero: {
        hmtai: ['ero'],
    },
    feet: {
        hmtai: ['foot'],
    },
    femdom: {
        hmtai: ['femdom'],
    },
    glasses: {
        hmtai: ['glasses'],
    },
    hentai: {
        nekobot: ['hentai'],
        hmtai: ['hentai', 'gif'],
    },
    holo: {
        nekobot: ['holo'],
    },
    incest: {
        hmtai: ['incest'],
    },
    kemonomimi: {
        nekobot: ['kemonomimi'],
    },
    kitsune: {
        nekobot: ['hkitsune'],
    },
    masturbation: {
        hmtai: ['masturbation'],
    },
    midriff: {
        nekobot: ['hmidriff'],
    },
    neko: {
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
        hmtai: ['yuri'],
    },
    'zettai ryouiki': {
        hmtai: ['zettaiRyouiki'],
    },
};
