import { config } from 'dotenv';
config();
import { init } from '../src/database';
init();
import { disconnect } from 'mongoose';
import { User } from '../src/database/models/user';
import { Server } from '../src/database/models/server';

(async () => {
    disconnect();
})();
