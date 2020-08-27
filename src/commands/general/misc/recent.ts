import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import moment from 'moment';
import { IServer, Server } from '@nhentai/models/server';

export default class extends Command {
    constructor() {
        super('recent', {
            category: 'general',
            aliases: ['recent'],
            description: {
                content: "Stalking people's fetishes.",
            },
            cooldown: 3000,
        });
    }

    async exec(message: Message) {
        try {
            const server = await Server.findOne({
                serverID: message.guild.id,
            }).exec();
            if (!server)
                return message.channel.send(
                    this.client.embeds.info('There are no recent calls in this server.')
                );
            else {
                if (!server.recent.length)
                    return message.channel.send(
                        this.client.embeds.info('There are no recent calls in this server.')
                    );
                let recent = server.recent;
                recent.reverse();
                recent = recent.slice(0, 5);
                return message.channel.send(
                    this.client.embeds.info(
                        recent
                            .map(
                                x =>
                                    `${x.author} : **\`${x.id}\`** \`${x.title}\` (${moment(
                                        x.date
                                    ).fromNow()})`
                            )
                            .join('\n')
                    )
                );
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
