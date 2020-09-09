import axios from 'axios';

export default async (url: string) =>
    await axios.get(url).then(ret => {
        return {
            id: ret.request.res.responseUrl.match(
                /(?:(?:https?:\/\/)?nhentai\.net\/g\/)?([0-9]{1,6})/i
            ),
            details: ret.data,
        };
    });
