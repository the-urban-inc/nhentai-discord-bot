const axios = require('axios');

module.exports = async (url) => await axios.get(url).then(ret => ret.data);