import { config } from 'dotenv';
config();
import { createServer } from 'http';
createServer().listen(process.env.PORT || 8080);
import path from 'path';
path.join(__dirname, 'package.json');
import { Client } from './structures/Client';
const client = new Client();
client.start();
