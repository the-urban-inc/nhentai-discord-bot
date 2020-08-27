import { Client, MessageEmbed } from 'discord.js';
import { model } from './';
import type { check } from './check';
import log from '@nhentai/utils/logger';

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
                        .setDescription(`ID : [\`${d.id}\`]${
                            `(https://nhentai.net/g/${d.id})`
                        } | Matching tag : **${d.tags.get(tagId)}**`)
                        .setImage(`https://t.nhentai.net/galleries/${d.media_id}/thumb.jpg`)
                ).then(
                    m => log.info(
                        `Notified user ${user.username} (${user.id}) of doujin ${d.id}.`
                        + `\nMessage ID : ${m.id}`
                    )
                )
            })
        })
    })
}