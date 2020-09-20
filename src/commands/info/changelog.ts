import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import { Octokit } from '@octokit/rest';
const { npm_package_repository_url, npm_package_version } = process.env;

const client = new Octokit({
    userAgent: `nhentai v${npm_package_version}`,
});

export default class extends Command {
    constructor() {
        super('changelog', {
            aliases: ['changelog', 'updates', 'commits'],
            channel: 'guild',
            description: {
                content: "Responds with the bot's latest 10 commits.",
            },
        });
    }

    async exec(message: Message) {
        const [repo, owner] = npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        const { data } = await client.repos.listCommits({
            repo: repo.replace('.git', ''),
            owner,
            per_page: 10,
        });
        const embed = this.client.util
            .embed()
            .setTitle(`[${repo}:master] Latest ${data.length} commit(s)`)
            .setURL(`https://github.com/${owner}/${repo}/commits/master`)
            .setDescription(
                data
                    .map(({ html_url, sha, commit: { message }, committer: { login } }) => {
                        message = message.split('\n').filter(a => a)[0];
                        message = message.length > 55 ? message.slice(0, 55) + '...' : message;
                        message = this.client.util.escapeMarkdown(message);
                        return `[\`${sha.slice(0, 7)}\`](${html_url}) ${message} - ${login}`;
                    })
                    .join('\n')
            );
        return message.channel.send({ embed });
    }
}
