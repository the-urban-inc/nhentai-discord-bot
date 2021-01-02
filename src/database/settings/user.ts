import { User as DiscordUser } from 'discord.js';
import { User } from '../models/user';
import { History, Blacklist } from '../models/tag';

export async function history(duser: DiscordUser, userHistory: History) {
    return await User.findOneAndUpdate(
        { userID: duser.id },
        { $push: { history: userHistory } },
        { upsert: true }
    ).exec()
}

export async function favorite(duser: DiscordUser, id: string) {
    let adding = false;
    const user = await User.findOne({
        userID: duser.id,
    }).exec();
    if (!user) {
        await new User({
            userID: duser.id,
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
        await user.save();
    }
    return adding;
}

export async function blacklist(duser: DiscordUser, info: Blacklist) {
    let adding = false;
    const user = await User.findOne({
        userID: duser.id,
    }).exec();
    if (!user) {
        await new User({
            userID: duser.id,
            blacklists: [info],
        }).save();
        adding = true;
    } else {
        const idx = user.blacklists.findIndex(bl => bl.id === info.id);
        if (idx > -1) {
            user.blacklists.splice(idx, 1);
        } else if (idx === -1) {
            user.blacklists.push(info);
            adding = true;
        }
        await user.save();
    }
    return adding;
}

export async function anonymous(duser: DiscordUser) {
    const user = await User.findOne({ userID: duser.id });
    if (!user) {
        await new User({
            userID: duser.id,
            anonymous: false,
        }).save();
        return false;
    } else {
        user.anonymous = !user.anonymous;
        await user.save();
        return user.anonymous;
    }
}
