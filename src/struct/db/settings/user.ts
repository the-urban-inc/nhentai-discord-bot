import { Message } from 'discord.js';
import { User } from '../models/user';
import { History, Blacklist } from '../models/tag';

export async function history(message: Message, userHistory: History) {
    const user = await User.findOne({ userID: message.author.id });
    if (!user) {
        await new User({
            userID: message.author.id,
            history: [userHistory],
        }).save();
    } else {
        user.history.push(userHistory);
        user.save();
    }
}

export async function favorite(message: Message, id: string) {
    let adding = false;
    const user = await User.findOne({
        userID: message.author.id,
    }).exec();
    if (!user) {
        await new User({
            userID: message.author.id,
            favorites: [id],
        }).save();
        adding = true;
    } else {
        if (user.favorites.includes(id)) {
            user.favorites.splice(user.favorites.indexOf(id), 1);
        } else {
            user.favorites.push(id);
            adding = true;
        }
        user.save();
    }
    return adding;
}

export async function blacklist(message: Message, info: Blacklist) {
    let adding = false;
    const user = await User.findOne({
        userID: message.author.id,
    }).exec();
    if (!user) {
        await new User({
            userID: message.author.id,
            blacklists: [info],
        }).save();
        adding = true;
    } else {
        if (user.blacklists.includes(info)) {
            user.blacklists.splice(user.blacklists.indexOf(info), 1);
        } else {
            user.blacklists.push(info);
            adding = true;
        }
        user.save();
    }
    return adding;
}

export async function anonymous(message: Message) {
    const user = await User.findOne({ userID: message.author.id });
    if (!user) {
        await new User({
            userID: message.author.id,
            anonymous: false,
        }).save();
        return false;
    } else {
        user.anonymous = !user.anonymous;
        user.save();
        return user.anonymous;
    }
}
