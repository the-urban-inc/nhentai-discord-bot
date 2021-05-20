import express from 'express';
import PDFDocument from 'pdfkit';
import he from 'he';
import axios from 'axios';
import { Logger } from '@structures';
import { Client as NhentaiAPI } from '@api/nhentai';
const log = new Logger();
const api = new NhentaiAPI();
const app = express();
const port = process.env.PORT ?? 80;

app.get('/download/:code/', async (req, res) => {
    const code = req.params.code;
    res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `attachment; filename=${code}.pdf`
    });
    const gallery = (await api.g(+code)).gallery;
    const {
        title: { english: title },
        upload_date,
        tags,
        images: { pages: images },
    } = gallery;
    const t = new Map();
    tags.sort((a, b) => b.count - a.count);
    tags.forEach(tag => {
        const { type, name } = tag;
        const a = t.get(type) || [];
        a.push(name);
        t.set(type, a);
    });
    const doc = new PDFDocument({
        margin: 50,
        info: {
            Title: he.decode(title),
            Author: t.get('artist').join(', '),
            Keywords: t.get('tag').join(', '),
            CreationDate: new Date(upload_date * 1000),
        },
    });
    const stream = doc.pipe(res);
    const pages = api.getPages(gallery);
    for await (const [idx, page] of pages.entries()) {
        const { w, h } = images[idx];
        doc.addPage({ size: [w, h] });
        const data = await axios
            .get(page, { responseType: 'arraybuffer' })
            .then(res => Buffer.from(res.data));
        doc.image(data, 0, 0);
    }
    doc.end();
    stream.on('end', () => res.end());
});

app.listen(port, () => {
    log.info(`Listening at port ${port}.`);
});
