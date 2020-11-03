import { MessageEmbed } from 'discord.js';
import { RichDisplay, RichDisplayOptions } from '@inari/struct/pagination/RichDisplay';
import { RichMenu } from '@inari/struct/pagination/RichMenu';

export default class {
    static richDisplay(options?: RichDisplayOptions) {
        return new RichDisplay(options);
    }

    static richMenu(options?: RichDisplayOptions) {
        return new RichMenu(options);
    }

    static info(text: string) {
        return new MessageEmbed().setColor('#f0f0f0').setDescription(text);
    }

    static clientError(text: string) {
        return new MessageEmbed().setColor('#ff0000').setDescription(text);
    }

    static internalError(text: string) {
        return new MessageEmbed()
            .setColor('#ff0000')
            .setDescription(
                `An unexpected error has occurred${
                    text.length < 2000 ? `:\n\`\`\`${text}\`\`\`` : '.'
                }`
            );
    }

    static success() {
        return new MessageEmbed().setColor('#ff66ab');
    }
}
