const { Command } = require('discord-akairo');
const { MessageEmbed, MessageAttachment } = require('discord.js');
const JSZip = require('jszip');
/* const axiosDefaultConfig = {
    baseURL: 'https://jsonplaceholder.typicode.com/posts',
    proxy: {
        host: '0.tcp.ngrok.io',
        port: 19705,
        protocol: 'tcp'
    }
};
const axiosProxy = require('axios-https-proxy-fix').create(axiosDefaultConfig); */
const axios = require('axios');
const RichDisplay = require('../utils/richDisplay');

module.exports = class DownloadCommand extends Command {
	constructor() {
		super('download', {
            category: 'general',
			aliases: ['download'],
			description: {
                content: 'Downloads a doujin from nHentai. Returns a zip file.',
                usage: '<code>',
                examples: ['177013']
            },
            args: [{
                id: 'code',
                type: 'string',
                match: 'text'
            }],
            cooldown: 60000
		});
    }
    
    icon = 'https://pbs.twimg.com/profile_images/733172726731415552/8P68F-_I_400x400.jpg';

    async exec(message, { code }) {
        let msg = await message.channel.send('Fetching...');
		this.client.nhentai.g(code).then(async doujin => {
            let zip = new JSZip();
            await msg.edit('Downloading ...');
            for (const [idx, page] of doujin.getPages().entries()) {
                await msg.edit(`Downloading ${idx + 1}/${doujin.num_pages} pages ...`);
                const data = axios.get(page, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data, 'binary').toString('base64'));
                zip.file(`${idx + 1}.jpg`, data, { base64: true });
            }
            await msg.edit('Compressing ...');
            await zip.generateAsync({ type: 'nodebuffer', streamFiles: true }).then(async (buffer) => {
                await msg.edit('Done.');
                return message.channel.send('Here\'s the downloaded doujin saved in a zip file.', {
                    files: [{
                        // File too large to send to Discord 
                        attachment: buffer,
                        name: `${code}.zip`
                    }]
                });
            });
        }).catch(err => {
            this.client.logger.error(err);
            return message.channel.send(new MessageEmbed()
                .setAuthor('❌ Error')
                .setColor('#ff0000')
                .setDescription('An unexpected error has occurred. Are you sure this is an existing doujin?')
                .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
                .setTimestamp()
            )
        });
	}
};