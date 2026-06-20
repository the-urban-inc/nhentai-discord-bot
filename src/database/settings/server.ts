import { Guild } from 'discord.js';
import { Server as S } from '../models/server';
import { History } from '../models/tag';

export class Server {
    /**
     * Returns the server document, creating it with default settings if it does not
     * yet exist. Uses an atomic upsert so concurrent commands cannot race to create
     * two records for the same guild.
     */
    async findOrCreate(serverID: Guild['id']) {
        // upsert + new guarantees a document is returned, so the assertion is safe.
        return (await S.findOneAndUpdate(
            { serverID },
            { $setOnInsert: { serverID, settings: { danger: false } } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ))!;
    }

    async history(serverID: Guild['id'], serverHistory: History) {
        return await S.findOneAndUpdate(
            { serverID },
            { $push: { recent: serverHistory } },
            { upsert: true }
        ).exec();
    }

    async danger(serverID: Guild['id']) {
        const server = await S.findOne({ serverID }).exec();
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
        const server = await S.findOne({ serverID }).exec();
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

    async private(serverID: Guild['id']) {
        const server = await S.findOne({ serverID }).exec();
        if (!server) {
            await new S({
                serverID,
                settings: { private: true },
            }).save();
            return true;
        } else {
            server.settings.private = !server.settings.private;
            await server.save();
            return server.settings.private;
        }
    }
}
