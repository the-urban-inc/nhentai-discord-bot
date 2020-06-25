import { Client, MessageEmbed } from 'discord.js';
import { model } from './';
import type { check } from './check';

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type _ = ThenArg<ReturnType<typeof check>>

const client = new Client({
    messageCacheMaxSize: 1
});

client.login(process.env.DISCORD_TOKEN);

export async function dispatch (_ : _){
    // for each tag-id to check, we'll go through the tags of each doujin
    // to check whether that doujin matches
    // if yes, dispatch & cache, so that we don't send a doujin twice
    let ids = (await model.find({}).exec());

    // cache each sends
    let cache = new Map<string, Set<number>>();

    ids.forEach(({ id: tagId, user }) => {
        let targets = _.filter(a => a.tags.has(tagId));
        user.forEach(async userId => {
            let user = await client.users.fetch(userId);

            // deleted user?
            if (!user) return;

            targets.forEach(d => {

                // check if this user were sent this target
                if (!cache.has(userId)) cache.set(userId, new Set<number>());
                if (cache.get(userId).has(d.id)) return;
                cache.get(userId).add(d.id);

                // and send?
                user.send(
                    new MessageEmbed()
                        .setTitle(`${d.title.english}`)
                        .setURL(`https://nhentai.net/g/${d.id}`)
                        .setDescription(`with tag **${d.tags.get(tagId)}**`)
                );
            })
        })
    })
}