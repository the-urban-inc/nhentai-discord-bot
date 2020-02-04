const axios = require('axios');

module.exports = (url) => axios.get(url).then(ret => ret.data);