import { Command } from '@structures';
import { Message, User } from 'discord.js';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];

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
            '\n*slap* ...',
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
            '\n*squeeze* ...',
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
            '\n*squeeze* ...',
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
            cooldown: 10000,
            description: {
                usage: '[user]',
            },
            error: {
                'No Result': {
                    message: 'Failed to fetch image!',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
                'Parsing Failed': {
                    message: 'An error occurred while parsing command.',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
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
            let method = message.util?.parsed?.alias;
            if (!(method in ACTIONS)) {
                const idx = Object.keys(ACTIONS).findIndex(key => {
                    return ACTIONS[key].aliases?.includes(method);
                });
                if (idx === -1) {
                    return this.client.commandHandler.emitError(
                        new Error('Parsing Failed'),
                        message,
                        this
                    );
                }
                method = Object.keys(ACTIONS)[idx];
            }
            const image = await this.client.images.fetch(method as keyof typeof ACTIONS);
            if (!this.client.util.isUrl(image)) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const embed = this.client.embeds
                .default()
                .setTitle(
                    user === message.author
                        ? `You just got ${ACTIONS_PAST_TENSE[method]}!`
                        : `${message.author.tag} ${ACTIONS_PAST_TENSE[method]} ${user.tag}!`
                )
                .setDescription(`[Click here if image failed to load](${image})`)
                .setImage(image);
            return this.client.embeds.richDisplay({ image }).addPage(embed).useCustomFooters().run(
                this.client,
                message,
                message, // await message.channel.send('Searching ...'),
                '',
                {
                    collectorTimeout: 180000,
                }
            );
        } catch (err) {
            this.client.logger.error(err);
        }
    }
}
