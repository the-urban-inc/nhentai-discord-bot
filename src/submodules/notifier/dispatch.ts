import { MessageEmbed } from 'discord.js';
import he from 'he';
import moment from 'moment';
import { WatchModel } from './db/models/record';
import type { check } from './check';
import { ICON } from '@utils/constants';
import { Client, Logger } from '@structures';
const log = new Logger();

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type _ = ThenArg<ReturnType<typeof check>>;

const client = new Client({
    messageCacheMaxSize: 1,
});

client.login(process.env.DISCORD_TOKEN);

export async function dispatch(_: _) {
    // for each tag-id to check, we'll go through the tags of each doujin
    // to check whether that doujin matches
    // if yes, dispatch & cache, so that we don't send a doujin twice
    let ids = await WatchModel.find({}).exec();

    // cache each sends
    let cache = new Map<string, Set<number>>();

    ids.forEach(({ id: tagId, user }) => {
        let targets = _.filter(a => a.tags.has(tagId));
        user.forEach(async userId => {
            let user = await client.users.fetch(userId);

            // deleted user?
            if (!user) return;

            targets.forEach(d => {
                const doujin = d.out;
                let { tags, num_pages, upload_date } = doujin;
                let id = doujin.id,
                    title = he.decode(doujin.title.english);
                // check if this user were sent this target
                if (!cache.has(userId)) cache.set(userId, new Set<number>());
                if (cache.get(userId).has(+id)) return;
                cache.get(userId).add(+id);

                let info = new MessageEmbed()
                    .setAuthor(title, ICON, `https://nhentai.net/g/${id}`)
                    .setThumbnail(client.nhentai.getCoverThumbnail(doujin))
                    .setFooter(`ID : ${id} • Followed tags are wrapped in brackets []`)
                    .setTimestamp();
                let t = new Map();
                tags.forEach(tag => {
                    const { id, type, name, count } = tag;
                    let a = t.get(type) || [];
                    let s = `**\`${name}\`**\`(${count.toLocaleString()})\``;
                    if (ids.some(x => x.id === id)) s = `[${s}]`;
                    a.push(s);
                    t.set(type, a);
                });

                [
                    ['parody', 'Parodies'],
                    ['character', 'Characters'],
                    ['tag', 'Tags'],
                    ['artist', 'Artists'],
                    ['group', 'Groups'],
                    ['language', 'Languages'],
                    ['category', 'Categories'],
                ].forEach(
                    ([key, fieldName]) =>
                        t.has(key) && info.addField(fieldName, client.util.gshorten(t.get(key)))
                );
                info.addField('Pages', `**\`${num_pages}\`**`).addField(
                    'Uploaded',
                    moment(upload_date * 1000).fromNow()
                );
                // and send?
                user.send('A new doujin was released!', { embed: info }).then(m =>
                    log.info(
                        `[NOTIFIER] Notified user ${user.username} (${user.id}) of doujin ${id}.` +
                            `\nMessage ID : ${m.id}`
                    )
                );
            });
        });
    });
}
