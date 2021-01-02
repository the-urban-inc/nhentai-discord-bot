import { Listener as L } from 'discord-akairo';
import type { Client } from './Client';

export class Listener extends L {
    client: Client;
}
