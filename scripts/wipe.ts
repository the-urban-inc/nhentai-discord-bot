import { config } from 'dotenv';
config();
import { init } from '../src/struct/db';
init();
import { disconnect } from 'mongoose';
import { User } from '../src/struct/db/models/user';
import { Server } from '../src/struct/db/models/server';

(async () => {
    disconnect();
})();
