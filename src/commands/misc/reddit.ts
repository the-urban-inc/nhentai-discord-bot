import { Client, Command } from '@structures';
import { CommandInteraction } from 'discord.js';
import axios from 'axios';

const ICON =
    'https://cdn1.iconfinder.com/data/icons/somacro___dpi_social_media_icons_by_vervex-dfjq/500/reddit.png';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'reddit',
            description: 'Random post on r/nhentai',
            cooldown: 5000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const data = await axios
            .get('https://reddit.com/r/nhentai/random.json')
            .then(res => res.data[0].data.children[0].data);
        if (!data) throw new Error('No post found');
        const embed = this.client.embeds
            .default()
            .setAuthor(`u/${data.author}`, ICON, `https://reddit.com/user/${data.author}`)
            .setTitle(data.title)
            .setURL(`https://reddit.com${data.permalink}`)
            .setFooter(`Upvote ratio: ${data.upvote_ratio * 100}%`)
            .setTimestamp(data.created * 1000);
        if (data.url.match('.jpg') || data.url.match('.png')) embed.setImage(data.url);
        else embed.setImage(data.url + '.jpg');
        return interaction.editReply({ embeds: [embed] });
    }
}
