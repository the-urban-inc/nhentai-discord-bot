import { Client, Command, UserError } from '@structures';
import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, CommandInteraction, Message, MessageFlags } from 'discord.js';
import { decode } from 'he';
import { User, Server, Blacklist } from '@database/models';
import { Gallery } from '@api/nhentai';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'quiz',
            type: ApplicationCommandType.ChatInput,
            description:
                'Starts a quiz session: try to guess the title of the displayed doujin page.',
            cooldown: 30000,
            nsfw: true,
        });
    }

    danger = false;
    rawChoices: Gallery[] = [];
    blacklists: Blacklist[] = [];

    async before(interaction: CommandInteraction) {
        try {
            let user = await User.findOne({ userID: interaction.user.id }).exec();
            if (!user) {
                user = await new User({
                    userID: interaction.user.id,
                    blacklists: [],
                    language: {
                        preferred: [],
                        query: false,
                        follow: false,
                    },
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
            this.rawChoices = [];
            this.blacklists = [];
            this.danger = server.settings.danger;
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${err.message}`);
        }
    }

    async fetchRandomDoujin() {
        return await this.client.db.cache
            .safeRandom(
                this.danger,
                this.blacklists.map(bl => bl.id)
            )
            .catch(err => this.client.logger.error(err.message));
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const galleryID = await this.fetchRandomDoujin();
        if (!galleryID) {
            throw new UserError('NO_RESULT');
        }
        const gallery = await this.client.nhentai.g(galleryID, true);
        if (!gallery) {
            throw new UserError('NO_RESULT');
        }
        const page = this.client.util.random(this.client.nhentai.getPages(gallery.gallery));
        const quiz = this.client.embeds
            .default()
            .setTitle(`Guess which doujin is this picture from!`)
            .setDescription(
                'Use buttons to select an option within 30 seconds. Your first choice will be your final choice. No cheating!'
            )
            .setImage(page)
            .setFooter({
                text: 'Only the person who started the quiz can answer\u2000•\u2000Each answer will give you 50-100 xp',
            })
            .setTimestamp();
        const choices = this.client.util
            .shuffle(
                this.client.util.shuffle(gallery.related).slice(0, 3).concat([gallery.gallery])
            )
            .map(({ id, title: { english }, tags }) => {
                const title = decode(english);
                const t = new Map();
                tags.sort((a, b) => b.count - a.count);
                tags.forEach(tag => {
                    const { id, type, name, count } = tag;
                    const a = t.get(type) || [];
                    let s = `**\`${name}\`**\u2009\`(${
                        count >= 1000 ? `${Math.floor(count / 1000)}K` : count
                    })\``;
                    // let s = `**\`${name}\`** \`(${count.toLocaleString()})\``;
                    if (this.blacklists.some(bl => bl.id === id.toString())) s = `~~${s}~~`;
                    a.push(s);
                    t.set(type, a);
                });
                return {
                    id,
                    url: `https://nhentai.net/g/${id}`,
                    title,
                    artist: t.get('artist')
                        ? this.client.util.gshorten(t.get('artist'), '\u2009\u2009')
                        : '`N/A`',
                };
            });
        const abcd = ['A', 'B', 'C', 'D'];
        choices.forEach((c, i) => {
            quiz.addFields({
                name: `[${abcd[i]}] ${c.title}`,
                value: `Artists: ${c.artist}`,
            });
        });
        const message = (await interaction.editReply({
            embeds: [quiz],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder().setCustomId('0').setLabel('A').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('1').setLabel('B').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('2').setLabel('C').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('3').setLabel('D').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cancel').setLabel('Skip').setStyle(ButtonStyle.Danger),
                ]),
            ],
        })) as Message;
        const answer = choices.findIndex(({ id }) => +gallery.gallery.id === +id);
        const embed = this.client.embeds.default().setFooter({ text: 'Quiz session ended' });
        const buttons = [0, 1, 2, 3].map(i =>
            new ButtonBuilder()
                .setCustomId(String(i))
                .setLabel(abcd[i])
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
        );
        buttons[answer].setStyle(ButtonStyle.Success);
        message
            .awaitMessageComponent({
                filter: i =>
                    ['0', '1', '2', '3', 'cancel'].includes(i.customId) &&
                    i.user.id === interaction.user.id,
                time: 30000,
            })
            .then(async i => {
                await i.deferUpdate();
                if (i.customId === 'cancel') {
                    await interaction.editReply({
                        embeds: [quiz],
                        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)],
                    });
                    return interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#ffbf00')
                                .setAuthor({ name: '⏭️\u2000Skipped' })
                                .setDescription(
                                    `Quiz skipped. The correct answer was **[${abcd[answer]}] [${choices[answer].title}](${choices[answer].url})**.`
                                ),
                        ],
                        ...(interaction.options.get('private')?.value as boolean) && { flags: MessageFlags.Ephemeral },
                    });
                }
                const choice = parseInt(i.customId, 10);
                await interaction.editReply({
                    embeds: [quiz],
                    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)],
                });
                if (choice === answer) {
                    const min = 50,
                        max = 100;
                    const inc = Math.floor(Math.random() * (max - min)) + min;
                    interaction.followUp({
                        embeds: [
                            embed
                                .setColor('#008000')
                                .setAuthor({ name: '✅\u2000Correct' })
                                .setDescription(
                                    `Congratulations! You got it right!\nThe correct answer was **[${abcd[answer]}] [${choices[answer].title}](${choices[answer].url})**.`
                                )
                                .setFooter({
                                    text: `Received ${inc} xp\u2000•\u2000Quiz session ended`,
                                }),
                        ],
                        ...(interaction.options.get('private')?.value as boolean) && { flags: MessageFlags.Ephemeral },
                    });
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
                            ...(interaction.options.get('private')?.value as boolean) && { flags: MessageFlags.Ephemeral },
                        });
                    }
                    return;
                }
                return interaction.followUp({
                    embeds: [
                        embed
                            .setColor('#ff0000')
                            .setAuthor({ name: '❌\u2000Wrong Answer' })
                            .setDescription(
                                `Unfortunately, that was the wrong answer.\nThe correct answer was **[${abcd[answer]}] [${choices[answer].title}](${choices[answer].url})**.\nYou chose **[${abcd[choice]}] [${choices[choice].title}](${choices[choice].url})**.`
                            ),
                    ],
                    ...(interaction.options.get('private')?.value as boolean) && { flags: MessageFlags.Ephemeral },
                });
            })
            .catch(async err => {
                await interaction.editReply({
                    embeds: [quiz],
                    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)],
                });
                return interaction.followUp({
                    embeds: [
                        embed
                            .setColor('#ffbf00')
                            .setAuthor({ name: '⌛\u2000Timed out' })
                            .setDescription(
                                `The session timed out as you did not answer within 30 seconds. The correct answer was **[${abcd[answer]}] [${choices[answer].title}](${choices[answer].url})**.`
                            ),
                    ],
                    ...(interaction.options.get('private')?.value as boolean) && { flags: MessageFlags.Ephemeral },
                });
            });
    }
}
