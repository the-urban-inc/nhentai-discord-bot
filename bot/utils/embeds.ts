import { MessageEmbed } from 'discord.js';
import { NhentaiClient } from 'bot/struct/Client';
import { RichDisplay } from '@nhentai/utils/richDisplay';

export class Embeds {

    static display(client: NhentaiClient) {
        return new RichDisplay(client);
    }

    static info(text: string) {
        return new MessageEmbed()
            .setColor('#f0f0f0')
            .setDescription(text)
    } 

    static error(text = 'An unexpected error has occurred.') {
        return new MessageEmbed()
            .setColor('#ff0000')
            .setDescription(text)
    } 
};