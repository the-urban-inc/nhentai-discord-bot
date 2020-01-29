const axiosDefaultConfig = {
    baseURL: 'https://jsonplaceholder.typicode.com/posts',
    proxy: {
        host: '0.tcp.ngrok.io',
        port: 18200,
        protocol: 'tcp'
    }
};

const axiosProxy = require('axios-https-proxy-fix').create(axiosDefaultConfig);

module.exports = (url) => axiosProxy.get(url).then(ret => ret.data);

/* const axios = require('axios');

module.exports = (url) => axios.get(url).then(ret => ret.data); */