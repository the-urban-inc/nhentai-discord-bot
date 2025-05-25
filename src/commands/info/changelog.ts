import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';
const { npm_package_version, npm_package_repository_url } = process.env;

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'changelog',
            type: ApplicationCommandType.ChatInput,
            description: "Shows the bot's latest 5 commits",
        });
    }

    async exec(interaction: CommandInteraction) {
        let [repo, owner] = npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        repo = repo.replace('.git', '');

        let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`;
        let commitList = await fetch(url).then(res => res.json()) as {
            url: string;
            sha: string;
            html_url: string;
            commit: {
                message: string;
            };
            committer: {
                login: string;
            }
        }[]

        return interaction.editReply({
            embeds: [
                this.client.embeds
                    .default()
                    .setTitle(`[${repo}:master] Latest ${commitList.length} commit(s)`)
                    .setURL(`https://github.com/${owner}/${repo}/commits/master`)
                    .setDescription(
                        commitList
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
