import { config } from 'dotenv';
config();
import { createServer } from 'http';
createServer().listen(process.env.PORT || 8080);
import { InariClient } from './struct/bot/Client';
const client = new InariClient();
client.start();
