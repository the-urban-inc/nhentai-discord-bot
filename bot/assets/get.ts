const axiosDefaultConfig = {
    baseURL: 'https://jsonplaceholder.typicode.com/posts',
    proxy: {
        host: '0.tcp.ngrok.io',
        port: 18200,
        protocol: 'tcp'
    }
};

import axios from 'axios-https-proxy-fix';

axios.create(axiosDefaultConfig);

module.exports = (url: string) => axios.get(url).then(ret => ret.data); 