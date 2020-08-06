import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { Octokit } from '@octokit/rest';
const { npm_package_repository_url, npm_package_version } = process.env;

const client = new Octokit({
    userAgent: `nhentai v${npm_package_version}`
});

export class ChangelogCommand extends Command {
	constructor() {
		super('changelog', {
            category: 'info',
			aliases: ['changelog', 'updates', 'commits'],
            description: {
                content: 'Responds with the bot\'s latest 10 commits.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
		});
	}

	async exec(message: Message) {
		const [repo, owner] = npm_package_repository_url.split('/').filter(a => a).reverse()
        const { data } = await client.repos.listCommits({
            repo: repo.replace('.git', ''), owner, per_page: 10
        });
        const embed = new MessageEmbed()
            .setTitle(`[${repo}:master] Latest ${data.length} commit(s)`)
            .setURL(`https://github.com/${owner}/${repo}/commits/master`)
            .setDescription(
                data.map(({ html_url, sha, commit: { message }, committer: { login } }) => {
                    message = message.split('\n').filter(a => a)[0];
                    message = message.length > 55 ? message.slice(0, 55) + '...' : message;
                    return (
                        `[\`${sha.slice(0, 7)}\`](${html_url}) ${message} - ${login}`
                    )
                }).join('\n')
            )
		return message.channel.send({ embed });
	}
};