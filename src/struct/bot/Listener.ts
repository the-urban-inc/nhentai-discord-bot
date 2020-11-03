import { Listener } from 'discord-akairo';
import type { InariClient } from './Client';

export default class extends Listener {
    client: InariClient;
}
