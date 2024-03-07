import { Client, Command, UserError } from '@structures';
import {
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    Modal,
    ModalActionRowComponent,
    TextInputComponent,
} from 'discord.js';
import { User, Server, Blacklist } from '@database/models';
import { Gallery, GalleryResult } from '@api/nhentai';
import { BANNED_TAGS } from '@constants';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'guessthecode',
            type: 'CHAT_INPUT',
            description:
                'Starts a "Guess the code" session: try to guess the code of the displayed doujin thumbnail.',
            cooldown: 30000,
            nsfw: true,
        });
    }

    danger = false;
    related: Gallery[] = null;
    rawChoices: Gallery[] = [];
    blacklists: Blacklist[] = [];

    async before(interaction: CommandInteraction) {
        try {
            let user = await User.findOne({ userID: interaction.user.id }).exec();
            if (!user) {
                user = await new User({
                    userID: interaction.user.id,
                    blacklists: [],
                }).save();
            }
            this.blacklists = user.blacklists;
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    serverID: interaction.guild.id,
                    settings: { danger: false },
                }).save();
            }
            this.related = null;
            this.rawChoices = [];
            this.blacklists = [];
            this.danger = server.settings.danger;
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${err.message}`);
        }
    }

    async fetchRandomDoujin() {
        return await this.client.db.cache.safeRandom(this.danger, this.blacklists.map(bl => bl.id));
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const id = await this.fetchRandomDoujin();
        if (!id) {
            throw new UserError('NO_RESULT');
        }
        const gallery = await this.client.db.cache.getDoujin(id);
        if (!gallery) {
            throw new UserError('NO_RESULT');
        }
        const page = this.client.nhentai.getCover(gallery);
        const quiz = this.client.embeds
            .default()
            .setTitle(`Guess the code this doujin is from!`)
            .setDescription(
                'Come up with a guess within 1 minute (30 seconds to look at the thumbnail pic, 30 seconds to input your answer by clicking "Guess").\nThe closer your guess is the higher xp you\'ll get. Your first choice will be your final choice. No cheating!'
            )
            .setImage(page)
            .setFooter({
                text: 'Only the person who started the quiz can answer\u2000•\u2000Each answer will give you 0-75 xp',
            })
            .setTimestamp();
        const message = (await interaction.editReply({
            embeds: [quiz],
            components: [
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setCustomId('guess')
                        .setLabel('Guess')
                        .setStyle('SECONDARY'),
                    new MessageButton().setCustomId('cancel').setLabel('Skip').setStyle('DANGER'),
                ]),
            ],
        })) as Message;
        const answer = +gallery.id;
        const embed = this.client.embeds.default().setFooter({ text: 'Quiz session ended' });
        message
            .awaitMessageComponent({
                filter: i =>
                    ['guess', 'cancel'].includes(i.customId) && i.user.id === interaction.user.id,
                time: 30000,
            })
            .then(async i => {
                if (i.customId === 'cancel') {
                    await interaction.editReply({
                        embeds: [quiz],
                        components: [
                            new MessageActionRow().addComponents([
                                new MessageButton()
                                    .setCustomId('guess')
                                    .setLabel('Guess')
                                    .setStyle('SECONDARY')
                                    .setDisabled(true),
                            ]),
                        ],
                    });
                    return interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#ffbf00')
                                .setAuthor({ name: '⏭️\u2000Skipped' })
                                .setDescription(
                                    `Quiz skipped. The correct answer was \`${answer}\`.`
                                ),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                }
                const modal = new Modal()
                    .setCustomId(String(gallery.id))
                    .setTitle(this.client.user.username);
                const pageInput = new TextInputComponent()
                    .setCustomId('pageInput')
                    .setLabel('Input your guess!')
                    .setStyle('SHORT')
                    .setRequired(true);
                const firstActionRow =
                    new MessageActionRow<ModalActionRowComponent>().addComponents(pageInput);
                modal.addComponents(firstActionRow);
                await i.showModal(modal);
                const response = await i.awaitModalSubmit({
                    filter: mint => mint.user === i.user,
                    time: 30000,
                    idle: 30000,
                });
                await response.deferUpdate();
                let choice = parseInt(response.fields.getTextInputValue('pageInput'));
                await interaction.editReply({
                    embeds: [quiz],
                    components: [
                        new MessageActionRow().addComponents([
                            new MessageButton()
                                .setCustomId('guess')
                                .setLabel('Guess')
                                .setStyle('SECONDARY')
                                .setDisabled(true),
                        ]),
                    ],
                });
                if (isNaN(choice)) {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#008000')
                                .setAuthor({ name: '🤨\u2000HUH???' })
                                .setDescription(
                                    `That's not a number. Are you even trying??? The correct answer was \`${answer}\`.`
                                ),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                    return;
                }
                let inc = Math.max(
                    0,
                    Math.round((75 * (100 - Math.ceil(Math.abs(choice - answer) / 1000))) / 100)
                );
                if (choice === answer) {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#008000')
                                .setAuthor({ name: '🤩\u2000Amazing' })
                                .setDescription(
                                    `Congratulations! You got it right to the digit! The code is exactly \`${answer}\`!!!`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                } else if (this.client.util.isBetween(choice, answer - 10, answer) || this.client.util.isBetween(choice, answer, answer + 10)) {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#a3ff00')
                                .setAuthor({ name: '😔\u2000Just a little bit more' })
                                .setDescription(
                                    `You almost had it. The correct answer was \`${answer}\`. You chose \`${choice}\`.`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                } else if (this.client.util.isBetween(choice, answer - 100, answer) || this.client.util.isBetween(choice, answer, answer + 100)) {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#a3ff00')
                                .setAuthor({ name: '🥺\u2000So close' })
                                .setDescription(
                                    `You got really close there. The correct answer was \`${answer}\`. You chose \`${choice}\`.`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                } else if (this.client.util.isBetween(choice, answer - 1000, answer) || this.client.util.isBetween(choice, answer, answer + 1000)) {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#fff400')
                                .setAuthor({ name: '😬\u2000Pretty close' })
                                .setDescription(
                                    `You got pretty close there, though that was still \`${Math.abs(
                                        choice - answer
                                    )}\` off. The correct answer was \`${answer}\`. You chose \`${choice}\`.`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                } else if (this.client.util.isBetween(choice, answer - 10000, answer) || this.client.util.isBetween(choice, answer, answer + 10000)) {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#ffa700')
                                .setAuthor({ name: '😬\u2000Not a bad guess' })
                                .setDescription(
                                    `Unfortunately, that was still \`${Math.abs(
                                        choice - answer
                                    )}\` off. The correct answer was \`${answer}\`. You chose \`${choice}\`.`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                } else if (this.client.util.isBetween(choice, answer - 100000, answer) || this.client.util.isBetween(choice, answer, answer + 100000)) {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#ffa700')
                                .setAuthor({ name: '😬\u2000Not a bad guess' })
                                .setDescription(
                                    `Unfortunately, that was still \`${Math.abs(
                                        choice - answer
                                    )}\` off. The correct answer was \`${answer}\`. You chose \`${choice}\`.`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                } else {
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#ff0000')
                                .setAuthor({ name: '😖\u2000So far away' })
                                .setDescription(
                                    `Unfortunately, that was too far off. The correct answer was \`${answer}\`. You chose \`${choice}\`.`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                }
                if (inc > 0) {
                    const leveledUp = await this.client.db.xp.save(
                        'add',
                        'exp',
                        interaction.user.id,
                        interaction.guild.id,
                        inc
                    );
                    if (leveledUp) {
                        await interaction.followUp({
                            content: 'Congratulations! You have leveled up!',
                            ephemeral:
                                (interaction.options.get('private')?.value as boolean) ?? false,
                        });
                    }
                }
                return;
            })
            .catch(async err => {
                return interaction.followUp({
                    embeds: [
                        embed
                            .setColor('#ffbf00')
                            .setAuthor({ name: '⌛\u2000Timed out' })
                            .setDescription(
                                `The session timed out as you did not answer within 30 seconds. The correct answer was \`${answer}\`.`
                            ),
                    ],
                    ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                });
            });
    }
}
