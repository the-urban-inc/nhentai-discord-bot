const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-superfetch');
const { shorten, base64 } = require('../../utils/extensions');
const { GITHUB_USERNAME, GITHUB_PASSWORD, NHENTAI_GITHUB_REPO_USERNAME, NHENTAI_GITHUB_REPO_NAME } = process.env;

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
		const { body } = await fetch
			.get(`https://api.github.com/repos/${NHENTAI_GITHUB_REPO_USERNAME}/${NHENTAI_GITHUB_REPO_NAME}/commits`)
			.set({ Authorization: `Basic ${base64(`${GITHUB_USERNAME}:${GITHUB_PASSWORD}`)}` });
		const commits = body.slice(0, 10);
		const embed = new MessageEmbed()
			.setTitle(`[${NHENTAI_GITHUB_REPO_NAME}:master] Latest ${commits.length} commits`)
			.setURL(`https://github.com/${NHENTAI_GITHUB_REPO_USERNAME}/${NHENTAI_GITHUB_REPO_NAME}/commits/master`)
			.setDescription(commits.map(commit => {
                const hash = `[\`${commit.sha.slice(0, 7)}\`](${commit.html_url})`;
                const text = commit.commit.message.split('\n')[0];
				return `${hash} ${text.length < 50 ? text : shorten(text, 50)} - ${commit.author.login}`;
			}).join('\n'));
		return message.channel.send({ embed });
	}
};