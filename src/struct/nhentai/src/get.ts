import axios from 'axios';

export default async (url: string) => await axios.get(url).then(ret => {
    return {
        id: ret.request.res.responseUrl.match(new RegExp("(?:(?:https?:\/\/)?nhentai\.net\/g\/)?([0-9]{1,6})", 'i')).group(1),
        details: ret.data 
    }
});