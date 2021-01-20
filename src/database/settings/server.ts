import { Message } from 'discord.js';
import { Server } from '../models/server';
import { History } from '../models/tag';

export async function history(message: Message, serverHistory: History) {
    return await Server.findOneAndUpdate(
        { serverID: message.guild.id },
        { $push: { recent: serverHistory } },
        { upsert: true }
    ).exec();
}

export async function prefix(
    message: Message,
    type: 'nsfw' | 'sfw',
    action: 'add' | 'remove' | 'clear' | 'list',
    prefix?: string
) {
    const prefixDoc = { id: prefix, author: message.author.id, date: Date.now() };
    const updateType = type === 'nsfw' ? 'settings.prefixes.nsfw' : 'settings.prefixes.sfw';
    const server = await Server.findOneAndUpdate(
        { serverID: message.guild.id },
        action === 'add' || action === 'list'
            ? { $push: { [updateType]: { $each: action === 'add' ? [prefixDoc] : [] } } }
            : action === 'remove'
            ? { $pull: { [updateType]: { id: prefix } } }
            : { $set: { [updateType]: [] } },
        { new: true, upsert: true }
    ).exec();
    return server.settings.prefixes[type];
}

export async function danger(message: Message) {
    let server = await Server.findOne({ serverID: message.guild.id }).exec();
    if (!server) {
        await new Server({
            serverID: message.guild.id,
            settings: { danger: true },
        }).save();
        return true;
    } else {
        server.settings.danger = !server.settings.danger;
        await server.save();
        return server.settings.danger;
    }
}

export async function url(message: Message) {
    let server = await Server.findOne({ serverID: message.guild.id }).exec();
    if (!server) {
        await new Server({
            serverID: message.guild.id,
            settings: { url: true },
        }).save();
        return true;
    } else {
        server.settings.url = !server.settings.url;
        await server.save();
        return server.settings.url;
    }
}
