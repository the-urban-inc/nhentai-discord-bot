import { User as DUser, Guild } from 'discord.js';
import { User } from '../models/user';
import { IServer, Server } from '../models/server';

function recalculate(op: 'add' | 'sub' | 'set', before: number, amount: number) {
    switch (op) {
        case 'add':
            return before + amount;
        case 'sub':
            return before - amount > 0 ? before - amount : 0;
        case 'set':
            return amount;
        default:
            return 0;
    }
}

export class XP {
    levelToEXP(level: number) {
        return level * level * 100;
    }

    expToLevel(exp: number) {
        return Math.floor(0.01 * Math.sqrt(exp));
    }

    async save(op: 'add' | 'sub' | 'set', type: 'exp' | 'level', userID: DUser['id'], serverID: Guild['id'], amount: number) {
        let server = await Server.findOne({ serverID });
        if (!server) server = await new Server({ serverID }).save();

        const user = server.users.get(userID);

        let globalUser = await User.findOne({ userID });
        if (!globalUser) globalUser = await new User({ userID }).save();

        const _ = type === 'exp';
        if (!user) {
            const exp = _ ? amount : this.levelToEXP(amount),
                levels = _ ? this.expToLevel(amount) : amount;
            const newUser = {
                points: exp,
                level: levels,
            };
            server.users.set(userID, newUser);
            await server.save();
            if (!globalUser) {
                await new User({ userID, ...newUser }).save();
            } else {
                globalUser.points = exp;
                globalUser.level = levels;
                await globalUser.save();
            }
            return newUser.level > 0;
        }

        const currentLevel = user.level!;

        const newEXP = recalculate(op, user.points!, amount),
            newGlobalEXP = recalculate(op, globalUser.points, amount);

        const newLevel = recalculate(op, user.level!, amount),
            newGlobalLevel = recalculate(op, globalUser.level, amount);

        user.points = _ ? newEXP : this.levelToEXP(newLevel);
        globalUser.points = _ ? newGlobalEXP : this.levelToEXP(newGlobalLevel);

        user.level = _ ? this.expToLevel(newEXP) : newLevel;
        globalUser.level = _ ? this.expToLevel(newGlobalEXP) : newGlobalLevel;

        // Recalculate global EXP
        globalUser.points = await this.accumulatedEXP(userID);
        globalUser.level = this.expToLevel(globalUser.points);

        // For some reason it didn't fucking update unless it's a new entry
        server.users.delete(userID);
        server.users.set(userID, user);
        await server.save();
        await globalUser.save();

        return currentLevel < user.level;
    }

    async accumulatedEXP(userID: DUser['id']) {
        let servers: IServer[] = await Server.aggregate([
            {
                $addFields: { usersConverted: { $objectToArray: "$users" } }
            },
            {
                $match: {
                    "usersConverted.k": { $all: [userID] }
                }
            },
            {
                $project: {
                    usersConverted: 0
                }
            }
        ]);
        if (!servers) return 0;
        return servers.reduce((acc, current) => acc + current.users[userID].points, 0);
    }

    async getServerRanking(userID: DUser['id'], serverID: Guild['id']) {
        let server = await Server.findOne({ serverID });
        if (!server) server = await new Server({ serverID }).save();
        if (!server.users.size) return '-';
        if (!server.users.has(userID)) return '-';
        const sorted = new Map(
            [...server.users.entries()].sort((x, y) => y[1].points! - x[1].points!)
        );
        const rank = [...sorted.keys()].indexOf(userID) + 1;
        return rank === 0 ? '-' : rank.toString();
    }

    async getGlobalRanking(points: number) {
        const rank = (await User.find({ points: { $gt: points } }).countDocuments()) + 1;
        return points === 0 ? '-' : rank.toString();
    }
}
