import { Inhibitor as I } from 'discord-akairo';
import type { Client } from './Client';

export class Inhibitor extends I {
    client: Client;
}
