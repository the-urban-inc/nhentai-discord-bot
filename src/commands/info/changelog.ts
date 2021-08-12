import { Client, Command } from '@structures';
import { CommandInteraction } from 'discord.js';
import { Octokit } from '@octokit/rest';
const { npm_package_version, npm_package_repository_url } = process.env;

const client = new Octokit({
    userAgent: `nhentai v${npm_package_version}`,
});

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'changelog',
            type: 'CHAT_INPUT',
            description: "Shows the bot's latest 5 commits",
        });
    }

    async exec(interaction: CommandInteraction) {
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
        return interaction.editReply({
            embeds: [
                this.client.embeds
                    .default()
                    .setTitle(`[${repo}:master] Latest ${data.length} commit(s)`)
                    .setURL(`https://github.com/${owner}/${repo}/commits/master`)
                    .setDescription(
                        data
                            .map(({ html_url, sha, commit: { message }, committer: { login } }) => {
                                message = message.split('\n').filter(a => a)[0];
                                message =
                                    message.length > 55 ? message.slice(0, 55) + '...' : message;
                                message = this.client.util.escapeMarkdown(message);
                                return `[\`${sha.slice(
                                    0,
                                    7
                                )}\`](${html_url}) ${message} - ${login}`;
                            })
                            .join('\n')
                    ),
            ],
        });
    }
}
