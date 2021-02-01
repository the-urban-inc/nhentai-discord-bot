import { Command } from '@structures';
import { Message } from 'discord.js';
import moment from 'moment';
import { Server } from '@models/server';

export default class extends Command {
    constructor() {
        super('recent', {
            aliases: ['recent'],
            nsfw: true,
            cooldown: 10000,
            description: {
                content:
                    'Shows recent nhentai-related command calls in this server.\nIf someone has anonymous mode on, his/her command calls will not be recorded.',
                examples: ["\nStalking people's fetishes."],
            },
        });
    }

    async exec(message: Message) {
        try {
            const server = await Server.findOne({
                serverID: message.guild.id,
            }).exec();
            if (!server) {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setTitle(message.guild.name)
                        .setDescription('There are no recent calls in this server!')
                );
            } else {
                if (!server.recent.length) {
                    return message.channel.send(
                        this.client.embeds
                            .default()
                            .setTitle(message.guild.name)
                            .setDescription('There are no recent calls in this server!')
                    );
                }
                let recent = server.recent.reverse().slice(0, 5);
                let _ = await Promise.all(
                    recent.map(async x => {
                        return `${(await this.client.users.fetch(x.author)).tag} : **\`${
                            x.id
                        }\`** \`${x.name}\` (${moment(x.date).fromNow()})`;
                    })
                );
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setTitle(message.guild.name)
                        .setDescription(_.join('\n'))
                );
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
