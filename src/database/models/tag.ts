export interface History {
    id: string;
    type: string;
    name: string;
    author: string;
    guild: string;
    date: number;
}

export interface Blacklist {
    id: string;
    type: string;
    name: string;
}

export interface Language {
    preferred: {
        id: string;
        name: string;
    }[];
    query: boolean;
    follow: boolean;
}
