const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error("Missing DISCORD_TOKEN or CLIENT_ID in environment variables.");
    process.exit(1);
}

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
        console.error('Error reloading application (/) commands:', error);
    }
})();
