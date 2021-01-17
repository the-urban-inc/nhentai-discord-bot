import { Command } from '@structures';
import { Message, User } from 'discord.js';

const ACTIONS = {
    tickle: {
        description: 'Tickle a person or get tickled.',
        examples: [
            '\nTickle tickle ...',
            ' @nhentai#7217\nTickle nhentai!',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
    slap: {
        description: 'Slap a person or get slapped.',
        examples: [
            '\n*slap\* ...',
            ' @nhentai#7217\nSlap nhentai!',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
    poke: {
        description: 'Poke a person or get poked.',
        examples: [
            '\nPoke, poke ...',
            ' @nhentai#7217\nPoke nhentai!',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
    pat: {
        description: 'Pat a person or get a pat.',
        examples: [
            '\nThere, there ...',
            ' @nhentai#7217\nGive nhentai a pat.',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
    kiss: {
        description: 'Kiss a person or get a kiss.',
        examples: [
            '\nChuuu ...',
            ' @nhentai#7217\nGive nhentai a kiss.',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
    hug: {
        description: 'Hug a person or get a hug.',
        examples: [
            '\n*squeeze\* ...',
            ' @nhentai#7217\nHug nhentai.',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
    feed: {
        description: 'Feed a person or get fed.',
        examples: [
            "\nSay 'Aaaa' ...",
            ' @nhentai#7217\nFeed nhentai.',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
    cuddle: {
        description: 'Cuddle a person or get a cuddle.',
        examples: [
            '\n*squeeze\* ...',
            ' @nhentai#7217\nCuddle nhentai.',
            ' 663743798722953258\nAlso works with user ID!',
        ],
    },
};

const ACTIONS_PAST_TENSE = {
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
            subAliases: ACTIONS,
            nsfw: false,
            description: {
                usage: '[user]',
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
                throw new Error(
                    `Unknown Action. Available actions are: ${Object.keys(ACTIONS)
                        .map(x => `${x}`)
                        .join(', ')}`
                );
            }
            const image = (await this.client.nekoslife.sfw[method]()).url;
            const embed = this.client.util
                .embed()
                .setTitle(
                    user === message.author
                        ? `You just got ${ACTIONS_PAST_TENSE[method]}!`
                        : `${message.author.tag} ${ACTIONS_PAST_TENSE[method]} ${user.tag}!`
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
