import { Message } from 'discord.js';
import { User } from '../models/user';
import { Server } from '../models/server';

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

export function levelToEXP(level: number) {
    return level * level * 100;
}

export function expToLevel(exp: number) {
    return Math.floor(0.1 * Math.sqrt(exp));
}

export async function save(
    op: 'add' | 'sub' | 'set',
    type: 'exp' | 'level',
    message: Message,
    amount: number
) {
    let server = await Server.findOne({ serverID: message.guild!.id });
    if (!server) server = await new Server({ serverID: message.guild!.id }).save();

    const user = server.users.get(message.author.id);

    let globalUser = await User.findOne({ userID: message.author.id });
    if (!globalUser) globalUser = await new User({ userID: message.author.id }).save();

    const _ = type === 'exp';
    if (!user) {
        const exp = _ ? amount : levelToEXP(amount),
            levels = _ ? expToLevel(amount) : amount;
        const newUser = {
            points: exp,
            level: levels,
        };
        server.users.set(message.author.id, newUser);
        await server.save();
        if (!globalUser) {
            await new User(newUser).save();
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

    user.points = _ ? newEXP : levelToEXP(newLevel);
    globalUser.points = _ ? newGlobalEXP : levelToEXP(newGlobalLevel);

    user.level = _ ? expToLevel(newEXP) : newLevel;
    globalUser.level = _ ? expToLevel(newGlobalEXP) : newGlobalLevel;

    // For some reason it didn't fucking update unless it's a new entry
    server.users.delete(message.author.id);
    server.users.set(message.author.id, user);
    await server.save();
    await globalUser.save();

    return currentLevel < user.level;
}

export async function getServerRanking(message: Message) {
    let server = await Server.findOne({ serverID: message.guild!.id });
    if (!server) server = await new Server({ serverID: message.guild!.id }).save();
    if (!server.users.size) return '-';
    if (!server.users.has(message.author.id)) return '-';
    const sorted = new Map([...server.users.entries()].sort((x, y) => y[1].points! - x[1].points!));
    const rank = [...sorted.keys()].indexOf(message.author.id) + 1;
    return rank === 0 ? '-' : rank.toString();
}

export async function getGlobalRanking(points: number) {
    const rank = (await User.find({ points: { $gt: points } }).countDocuments()) + 1;
    return points === 0 ? '-' : rank.toString();
}
