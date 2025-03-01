import { Client, Command, UserError } from '@structures';
import { ApplicationCommandOptionType, ApplicationCommandType, AutocompleteInteraction, CommandInteraction, User } from 'discord.js';
import { ACTIONS } from '@api/images';
import Fuse from 'fuse.js';

const ACTIONS_PAST_TENSE = {
    bite: 'bit someone',
    blushed: 'blushed in front of someone',
    boop: 'booped someone',
    bonk: 'bonked someone',
    bully: 'bullied someone',
    blush: 'blushed in front of someone',
    cuddle: 'cuddled with someone',
    cry: 'cried in front of someone',
    dance: 'danced with someone',
    depression: 'felt depressed with someone',
    feed: 'fed someone',
    glomp: 'glomped someone',
    handhold: 'held hands with someone',
    highfive: 'high-fived someone',
    hug: 'hugged someone',
    kick: 'kicked someone',
    kill: 'killed someone',
    kiss: 'kissed someone',
    lick: 'licked someone',
    like: 'liked someone',
    nom: 'nommed on someone',
    nosebleed: 'had a nosebleed at someone',
    pat: 'patted someone',
    poke: 'poked someone',
    punch: 'punched someone',
    slap: 'slapped someone',
    sleep: 'slept with someone',
    smile: 'smiled at someone',
    smug: 'smugged at someone',
    tea: 'had tea with someone',
    threaten: 'threatened someone',
    throw: 'threw someone away',
    tickle: 'tickled someone',
    wave: 'waved at someone',
    wink: 'winked at someone',
};

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'action',
            type: ApplicationCommandType.ChatInput,
            description: 'Perform an action on someone (or on yourself)',
            cooldown: 5000,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'The action to perform (type list to see action list)',
                    autocomplete: true,
                    required: true,
                },
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user to perform action on',
                },
            ],
        });
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.options.getFocused() || !interaction.options.getFocused().length) {
            return await interaction.respond([
                {
                    name: 'list',
                    value: 'list',
                },
            ]);
        }
        await interaction.respond(
            new Fuse(Object.keys(ACTIONS_PAST_TENSE), {
                includeScore: true,
                threshold: 0.1,
            })
                .search(interaction.options.getFocused(), { limit: 25 })
                .map(f => {
                    return {
                        name: f.item,
                        value: f.item,
                    };
                })
        );
    }

    async exec(interaction: CommandInteraction) {
        const action = interaction.options.get('action').value as string;
        if (action === 'list') {
            return interaction.editReply(
                `Here's the action list: ${Object.keys(ACTIONS_PAST_TENSE)
                    .map(x => `\`${x}\``)
                    .join(',  ')}.`
            );
        }
        const user = (interaction.options.get('user')?.user as User) ?? interaction.user;
        const image = await this.client.images.fetch('actions', action as keyof typeof ACTIONS);
        if (!this.client.util.isUrl(image)) {
            throw new UserError('NO_RESULT');
        }
        return this.client.embeds
            .paginator(this.client, {
                startView: 'thumbnail',
                image,
                collectorTimeout: 300000,
            })
            .addPage('thumbnail', {
                embed: this.client.embeds
                    .default()
                    .setTitle(
                        user === interaction.user
                            ? `You ${ACTIONS_PAST_TENSE[action].replace('someone', 'yourself')}`
                            : `${interaction.user.tag} ${ACTIONS_PAST_TENSE[action].replace(
                                  'someone',
                                  user.tag
                              )}!`
                    )
                    .setDescription(`[Click here if image failed to load](${image})`)
                    .setImage(image),
            })
            .run(interaction);
    }
}
