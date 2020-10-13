import { config } from 'dotenv';
config();
import { init } from '../src/struct/db';
init();
import { disconnect } from 'mongoose';
import { User } from '../src/struct/db/models/user';
import { Server } from '../src/struct/db/models/server';

(async () => {
    await User.updateMany({}, { $set: { points: 0 } }, { multi: true });
    await User.updateMany({}, { $set: { level: 0 } }, { multi: true });
    await User.updateMany({}, { $set: { history: [] } }, { multi: true });
    await Server.updateMany({}, { $set: { recent: [] } }, { multi: true });
    await Server.updateMany({}, { $set: { users: new Map() } }, { multi: true });
    disconnect();
})();
