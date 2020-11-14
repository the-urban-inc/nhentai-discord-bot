import Command from '@inari/struct/bot/Command';
import { Message, User } from 'discord.js';

const ACTIONS = {
    tickle: 'tickled',
    slap: 'slapped',
    poke: 'poked',
    pat: 'patted',
    kiss: 'kissed',
    hug: 'hugged',
    feed: 'fed',
    cuddle: 'cuddled',
};

export default class extends Command {
    constructor() {
        super('action', {
            aliases: Object.keys(ACTIONS),
            areMultipleCommands: true,
            channel: 'guild',
            nsfw: false,
            description: {
                content: 'Sends an anime image of a @. Ping a person to do it to them.',
                usage: '[user]',
                example: ['slap', 'poke @Inari#7217'],
            },
            args: [
                {
                    id: 'user',
                    type: 'user',
                    default: (message: Message) => message.author,
                },
            ],
        });
    }

    async exec(message: Message, { user }: { user: User }) {
        try {
            const method = message.util?.parsed?.alias as keyof typeof ACTIONS;
            if (!method) {
                throw new Error(`Unknown Action. Available actions are: ${Object.keys(ACTIONS).map(x => `${x}`).join(', ')}`);
            }
            const image = (await this.client.nekoslife.sfw[method]()).url;
            const embed = this.client.util
                .embed()
                .setTitle(
                    user === message.author
                        ? `You just got ${ACTIONS[method]}!`
                        : `${message.author.tag} ${ACTIONS[method]} ${user.tag}!`
                )
                .setDescription(`[Click here if image failed to load](${image})`)
                .setImage(image);
            return this.client.embeds
                .richDisplay({ image: true })
                .addPage(embed)
                .useCustomFooters()
                .run(this.client, message, await message.channel.send('Searching ...'), '', {
                    time: 180000,
                });
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
