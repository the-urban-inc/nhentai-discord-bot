const { MessageEmbed } = require('discord.js');

module.exports = class Embeds {
    static info(message, text) {
        return message.channel.send(new MessageEmbed()
			.setAuthor('ℹ️ Info')
			.setColor('#ffffff')
			.setDescription(text)
			.setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
			.setTimestamp());
    }

    static error(message, text = 'An unexpected error has occurred.') {
        return message.channel.send(new MessageEmbed()
			.setAuthor('❌ Error')
			.setColor('#ff0000')
			.setDescription(text)
			.setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
			.setTimestamp());
    }
};