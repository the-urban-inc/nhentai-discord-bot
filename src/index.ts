import { config } from 'dotenv';
config();
import { createServer, IncomingMessage, ServerResponse } from 'http';
createServer((req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200);
    res.end('Hello world!\n');
}).listen(process.env.PORT || 8080);
import { InariClient } from './struct/bot/Client';
const client = new InariClient();
client.start();
