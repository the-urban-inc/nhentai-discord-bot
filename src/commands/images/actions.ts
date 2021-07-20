import { Client, Command, UserError } from '@structures';
import { CommandInteraction, User } from 'discord.js';
import { ACTIONS } from '@api/images';

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
    constructor(client: Client) {
        super(client, {
            name: 'action',
            description: 'Perform an action on someone',
            cooldown: 5000,
            options: [
                {
                    name: 'action',
                    type: 'STRING',
                    description: 'The action to perform',
                    required: true,
                    choices: Object.keys(ACTIONS).map(k => {
                        return {
                            name: k,
                            value: k,
                        };
                    }),
                },
                {
                    name: 'user',
                    type: 'USER',
                    description: 'The user to perform action on',
                },
            ],
        });
    }

    async exec(interaction: CommandInteraction) {
        const action = interaction.options.get('action').value as keyof typeof ACTIONS;
        const user = (interaction.options.get('user')?.user as User) ?? interaction.user;
        const image = await this.client.images.fetch('actions', action);
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
                            ? `You just got ${ACTIONS_PAST_TENSE[action]}!`
                            : `${interaction.user.tag} ${ACTIONS_PAST_TENSE[action]} ${user.tag}!`
                    )
                    .setDescription(`[Click here if image failed to load](${image})`)
                    .setImage(image),
            })
            .run(interaction);
    }
}
