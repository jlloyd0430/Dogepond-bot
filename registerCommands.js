const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
    new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set the channel for the bot to post new content.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to post new content in')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('posts')
        .setDescription('Fetch and display the latest posts'),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();