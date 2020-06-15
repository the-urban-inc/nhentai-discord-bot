const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { Octokit } = require('@octokit/rest');
const { NPM_PACKAGE_REPO_URL, NPM_PACKAGE_VERSION } = process.env;

const client = new Octokit({
    userAgent: `nhentai v${NPM_PACKAGE_VERSION}`
});

module.exports = class ChangelogCommand extends Command {
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

	async exec(message) {
		if (!NPM_PACKAGE_REPO_URL || !NPM_PACKAGE_VERSION) return message.channel.send(this.client.embeds('error', 'Owner hasn\'t specified the Github parameters yet.'));
		const [repo, owner] = NPM_PACKAGE_REPO_URL.split('/').filter(a => a).reverse()
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