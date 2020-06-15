/* const axios = require('axios');

module.exports = async (url) => await axios.get(url).then(ret => ret.data); */

const axiosDefaultConfig = {
    baseURL: 'https://jsonplaceholder.typicode.com/posts',
    proxy: {
        host: '0.tcp.ngrok.io',
        port: 15204,
        protocol: 'tcp'
    }
};

const axiosProxy = require('axios-https-proxy-fix').create(axiosDefaultConfig);

module.exports = async (url) => await axiosProxy.get(url).then(ret => ret.data); 