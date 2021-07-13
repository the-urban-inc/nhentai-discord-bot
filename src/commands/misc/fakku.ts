import { Client, Command, UserError } from '@structures';
import { CommandInteraction } from 'discord.js';
import { Server } from '@database/models';
import { URL } from 'url';
import googleIt from 'google-it';
import { BANNED_TAGS_TEXT } from '@constants';

const ICON = 'https://awa-con.com/wp-content/uploads/2019/10/FAKKU.png';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'fakku',
            description: 'Searches for doujins on Fakku',
            cooldown: 10000,
            nsfw: true,
            options: [
                {
                    name: 'query',
                    type: 'STRING',
                    description: 'The query to search for',
                    required: true,
                },
            ],
        });
    }

    danger = false;
    warning = false;

    async before(interaction: CommandInteraction) {
        try {
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    settings: { danger: false },
                }).save();
            }
            this.danger = server.settings.danger;
            this.warning = false;
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${err.message}`);
        }
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const query = interaction.options.get('query').value as string;
        const consoleLog = console.log;
        console.log = function () {};
        const results: { link: string }[] = await googleIt({
            query,
            limit: 25,
            'only-urls': true,
            includeSites: 'https://fakku.net/hentai',
        }).catch((err: Error) => this.client.logger.error(err));
        console.log = consoleLog;
        const filtered = results
            .map(r => new URL(r.link))
            .filter(l => l.pathname.split('/').length === 3)
            .slice(0, 5);
        const doujins = await Promise.all(
            filtered.map(async res => {
                return {
                    url: res.toString(),
                    data: await this.client.fakku.doujin(res.pathname),
                };
            })
        );
        if (!doujins || !doujins.length) {
            throw new UserError('NO_RESULT', query);
        }
        const display = this.client.embeds.paginator(this.client, {
            collectorTimeout: 300000,
        });
        for (const { url, data: doujin } of doujins) {
            const { title, thumbnail } = doujin;
            const info = this.client.embeds
                .default()
                .setAuthor(title, ICON, url)
                .setTimestamp();
            Object.keys(doujin).forEach(t => {
                if (t === 'title' || t === 'thumbnail') return;
                if (t === 'tags') {
                    const prip = this.client.util.hasCommon(
                        doujin.tags.map((d: { name: string; href: string }) => d.name),
                        BANNED_TAGS_TEXT
                    );
                    if (prip) this.warning = true;
                    else info.setThumbnail(thumbnail);
                }
                info.addField(
                    this.client.util.capitalize(t),
                    typeof doujin[t] === 'string'
                        ? this.client.util.shorten(doujin[t], '\n', 1000)
                        : Array.isArray(doujin[t])
                        ? this.client.util.gshorten(
                              doujin[t].map((d: { name: string; href: string }) =>
                                  t === 'tags'
                                      ? `\`${d.name}\``
                                      : `[${d.name}](https://fakku.net${d.href})`
                              )
                          )
                        : `[${doujin[t].name}](https://fakku.net${doujin[t].href})`,
                    t !== 'description' && t !== 'tags'
                );
            });
            display.addPage('info', { embed: info });
        }
        await display.run(interaction, `> **Searching Fakku for** **\`${query}\`**`);
        if (!this.danger && this.warning) {
            await interaction.followUp(this.client.util.communityGuidelines());
        }
    }
}
