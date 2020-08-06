import { config } from 'dotenv'; config();
import { createServer } from 'https'; createServer().listen(process.env.PORT || 8080);
import { NhentaiClient } from './struct/Client';
const client = new NhentaiClient();
client.start();