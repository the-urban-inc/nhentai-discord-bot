import { Guild } from 'discord.js';
import { Server as S } from '../models/server';
import { History } from '../models/tag';

export class Server {
    async history(serverID: Guild['id'], serverHistory: History) {
        return await S.findOneAndUpdate(
            { serverID },
            { $push: { recent: serverHistory } },
            { upsert: true }
        ).exec();
    }

    async danger(serverID: Guild['id']) {
        let server = await S.findOne({ serverID }).exec();
        if (!server) {
            await new S({
                serverID,
                settings: { danger: true },
            }).save();
            return true;
        } else {
            server.settings.danger = !server.settings.danger;
            await server.save();
            return server.settings.danger;
        }
    }

    async url(serverID: Guild['id']) {
        let server = await S.findOne({ serverID }).exec();
        if (!server) {
            await new S({
                serverID,
                settings: { url: true },
            }).save();
            return true;
        } else {
            server.settings.url = !server.settings.url;
            await server.save();
            return server.settings.url;
        }
    }
}
