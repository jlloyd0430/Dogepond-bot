const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, () => {
    console.log('Discord bot is ready!');
    console.log(`Invite the bot using this URL: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=2147483647&scope=bot%20applications.commands`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'posts') {
        await interaction.deferReply(); // Acknowledge the interaction

        try {
            const url = `${process.env.BACKEND_URL}/api/nftdrops/approved`;
            console.log(`Requesting data from: ${url}`);

            const response = await axios.get(url);
            const posts = response.data;

            console.log('Fetched posts:', posts); // Log fetched posts

            if (posts.length === 0) {
                await interaction.editReply('No posts available.');
                return;
            }

            const embeds = posts.map(post => {
                const embed = new EmbedBuilder()
                    .setTitle(post.projectName)
                    .setDescription(post.description || 'No description provided.')
                    .addFields(
                        { name: 'Price', value: post.price.toString(), inline: true },
                        { name: 'Whitelist Price', value: post.wlPrice.toString(), inline: true },
                        { name: 'Date', value: new Date(post.date).toLocaleDateString(), inline: true },
                        { name: 'Time', value: post.time, inline: true },
                        { name: 'Supply', value: post.supply.toString(), inline: true },
                        { name: 'Likes', value: post.likes.length.toString(), inline: true },
                        { name: 'Website', value: post.website || 'No website provided.' },
                        { name: 'Twitter', value: `[Twitter](https://twitter.com/${post.twitter || ''})`, inline: true },
                        { name: 'Discord', value: `[Discord](${post.discord || ''})`, inline: true },
                        { name: 'Telegram', value: `[Telegram](${post.telegram || ''})`, inline: true }
                    );

                if (post.image) {
                    const imageUrl = `${process.env.BACKEND_URL}/uploads/${post.image}`;
                    console.log(`Image URL: ${imageUrl}`);
                    embed.setImage(imageUrl);
                }

                return embed;
            });

            console.log('Constructed embeds:', embeds); // Log constructed embeds

            await interaction.editReply({ embeds });
        } catch (error) {
            console.error('Error fetching posts:', error);
            await interaction.editReply(`Error fetching posts: ${error.message}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);