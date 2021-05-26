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
    nsfw_ahegao: {
        hmtai: ['ahegao'],
    },
    nsfw_anal: {
        nekoslife: ['anal'],
        nekobot: ['hanal'],
    },
    nsfw_ass: {
        nekobot: ['hass'],
        hmtai: ['ass'],
    },
    nsfw_avatar: {
        nekoslife: ['avatar'],
    },
    nsfw_bdsm: {
        hmtai: ['bdsm'],
    },
    nsfw_blowjob: {
        nekoslife: ['bJ', 'blowJob'],
        hmtai: ['blowjob'],
    },
    nsfw_boobs: {
        nekoslife: ['boobs', 'tits'],
        nekobot: ['hboobs'],
    },
    nsfw_creampie: {
        hmtai: ['creampie'],
    },
    nsfw_cuckold: {
        hmtai: ['cuckold'],
    },
    nsfw_cum: {
        nekoslife: ['cumsluts', 'cumArts'],
        hmtai: ['cum'],
    },
    nsfw_elf: {
        hmtai: ['elves'],
    },
    nsfw_ero: {
        nekoslife: ['ero'],
        hmtai: ['ero'],
    },
    nsfw_feet: {
        nekoslife: ['feet', 'feetGif', 'eroFeet'],
        hmtai: ['foot'],
    },
    nsfw_femdom: {
        nekoslife: ['femdom'],
        hmtai: ['femdom'],
    },
    nsfw_futa: {
        nekoslife: ['futanari'],
    },
    nsfw_glasses: {
        hmtai: ['glasses'],
    },
    nsfw_hentai: {
        nekoslife: ['classic', 'randomHentaiGif'],
        nekobot: ['hentai'],
        hmtai: ['hentai', 'gif'],
    },
    nsfw_holo: {
        nekoslife: ['holo', 'holoEro'],
        nekobot: ['holo'],
    },
    nsfw_incest: {
        hmtai: ['incest'],
    },
    nsfw_kemonomimi: {
        nekoslife: ['kemonomimi', 'eroKemonomimi'],
        nekobot: ['kemonomimi'],
    },
    nsfw_keta: {
        nekoslife: ['keta'],
    },
    nsfw_kitsune: {
        nekoslife: ['kitsune'],
        nekobot: ['hkitsune'],
    },
    nsfw_kuni: {
        nekoslife: ['kuni'],
    },
    nsfw_masturbation: {
        nekoslife: ['girlSolo', 'girlSoloGif'],
        hmtai: ['masturbation'],
    },
    nsfw_midriff: {
        nekobot: ['hmidriff'],
    },
    nsfw_neko: {
        nekoslife: ['neko', 'eroNeko', 'nekoGif'],
        nekobot: ['hneko'],
        hmtai: ['nsfwNeko'],
    },
    nsfw_orgy: {
        hmtai: ['orgy'],
    },
    nsfw_paizuri: {
        nekobot: ['paizuri'],
        hmtai: ['boobjob'],
    },
    nsfw_pantsu: {
        hmtai: ['pantsu'],
    },
    nsfw_public: {
        hmtai: ['public'],
    },
    nsfw_pussy: {
        nekoslife: ['pussy', 'pussyWankGif', 'pussyArt'],
        hmtai: ['vagina'],
    },
    nsfw_tentacle: {
        nekobot: ['tentacle'],
        hmtai: ['tentacles'],
    },
    nsfw_thigh: {
        nekobot: ['hthigh'],
        hmtai: ['thighs'],
    },
    nsfw_trap: {
        nekoslife: ['trap'],
    },
    nsfw_uniform: {
        hmtai: ['uniform'],
    },
    nsfw_wallpaper: {
        hmtai: ['nsfwMobileWallpaper'],
    },
    nsfw_yaoi: {
        nekobot: ['yaoi'],
    },
    nsfw_yuri: {
        nekoslife: ['yuri', 'eroYuri', 'lesbian'],
        hmtai: ['yuri'],
    },
    nsfw_zettaiRyouiki: {
        hmtai: ['zettaiRyouiki'],
    },
};
