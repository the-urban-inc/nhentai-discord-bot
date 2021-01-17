import { Command } from '@structures';
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
            description: {
                content: "Shows the bot's latest 5 commits.",
                examples: ['\nNerdy stuffs.'],
            },
        });
    }

    async exec(message: Message) {
        let [repo, owner] = npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        repo = repo.replace('.git', '');
        const { data } = await client.repos.listCommits({
            repo,
            owner,
            per_page: 5,
        });
        const embed = this.client.embeds
            .default()
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
