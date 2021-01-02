import { config } from 'dotenv';
config();
import { createServer } from 'http';
createServer().listen(process.env.PORT || 8080);
import { Client } from './structures/Client';
const client = new Client();
client.start();
