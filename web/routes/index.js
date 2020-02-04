const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

/* GET home page. */
router.get('/', async function(req, res, next) {
    const PATH = path.join(__dirname, '..', 'assets', 'sample.mp4');
    const stat = fs.statSync(PATH);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(PATH, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head);
        fs.createReadStream(PATH).pipe(res);
    }
});

module.exports = router;
