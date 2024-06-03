const { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let latestPostId = null;
let channelConfig = {}; // Define channelConfig here

client.once(Events.ClientReady, () => {
    console.log('Discord bot is ready!');
    console.log(`Invite the bot using this URL: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=2147483647&scope=bot%20applications.commands`);

    // Start polling for new posts
    startPolling();
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'setchannel') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply('You do not have permission to use this command.');
            return;
        }

        const channel = interaction.options.getChannel('channel');
        if (!channel || channel.type !== ChannelType.GuildText) {
            await interaction.reply('Please enter a valid text channel.');
            return;
        }

        try {
            const response = await axios.post(`${process.env.BACKEND_URL}/api/nftdrops/setchannel`, {
                guildId: interaction.guildId,
                channelId: channel.id
            });
            await interaction.reply(`Set the post channel to ${channel.name}`);
        } catch (error) {
            console.error('Error setting channel:', error);
            await interaction.reply('Error setting channel.');
        }
    }

    if (commandName === 'latest') {
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

            const latestPost = posts[0]; // Only take the latest post

            const embed = new EmbedBuilder()
                .setTitle(latestPost.projectName)
                .setDescription(latestPost.description || 'No description provided.')
                .addFields(
                    { name: 'Price', value: latestPost.price.toString(), inline: true },
                    { name: 'Whitelist Price', value: latestPost.wlPrice.toString(), inline: true },
                    { name: 'Date', value: new Date(latestPost.date).toLocaleDateString(), inline: true },
                    { name: 'Time', value: latestPost.time, inline: true },
                    { name: 'Supply', value: latestPost.supply.toString(), inline: true },
                    { name: 'Likes', value: latestPost.likes.length.toString(), inline: true },
                    { name: 'Website', value: latestPost.website || 'No website provided.' },
                    { name: 'Twitter', value: `[Twitter](https://twitter.com/${latestPost.twitter || ''})`, inline: true },
                    { name: 'Discord', value: `[Discord](${latestPost.discord || ''})`, inline: true },
                    { name: 'Telegram', value: `[Telegram](${latestPost.telegram || ''})`, inline: true }
                );

            if (latestPost.image) {
                const imageUrl = `${process.env.BACKEND_URL}/uploads/${latestPost.image}`;
                console.log(`Image URL: ${imageUrl}`);
                embed.setImage(imageUrl);
            }

            console.log('Constructed embed:', embed); // Log constructed embed

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching posts:', error);
            await interaction.editReply(`Error fetching posts: ${error.message}`);
        }
    }

    if (commandName === 'alldrops') {
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

client.on('error', console.error);
client.on('reconnecting', () => console.log('Reconnecting...'));
client.on('resume', () => console.log('Connection resumed.'));
client.on('disconnect', (event) => {
    console.log(`Disconnected: ${event.reason} (${event.code})`);
});

const startPolling = () => {
    setInterval(async () => {
        try {
            const url = `${process.env.BACKEND_URL}/api/nftdrops/approved`;
            console.log(`Polling data from: ${url}`);

            const response = await axios.get(url);
            const posts = response.data;

            console.log('Fetched posts during polling:', posts); // Log fetched posts

            if (posts.length > 0) {
                const latestPost = posts[0];

                // Check if the latest post is new
                if (latestPost.id !== latestPostId) {
                    latestPostId = latestPost.id; // Update the latest post ID

                    for (const guildId in channelConfig) {
                        const { data: channelConfig } = await axios.get(`${process.env.BACKEND_URL}/api/nftdrops/getchannel/${guildId}`);
                        const channelId = channelConfig.channelId;
                        const channel = client.channels.cache.get(channelId);

                        if (!channel) {
                            console.error(`Channel not found for guild ${guildId}`);
                            continue;
                        }

                        const embed = new EmbedBuilder()
                            .setTitle(latestPost.projectName)
                            .setDescription(latestPost.description || 'No description provided.')
                            .addFields(
                                { name: 'Price', value: latestPost.price.toString(), inline: true },
                                { name: 'Whitelist Price', value: latestPost.wlPrice.toString(), inline: true },
                                { name: 'Date', value: new Date(latestPost.date).toLocaleDateString(), inline: true },
                                { name: 'Time', value: latestPost.time, inline: true },
                                { name: 'Supply', value: latestPost.supply.toString(), inline: true },
                                { name: 'Likes', value: latestPost.likes.length.toString(), inline: true },
                                { name: 'Website', value: latestPost.website || 'No website provided.' },
                                { name: 'Twitter', value: `[Twitter](https://twitter.com/${latestPost.twitter || ''})`, inline: true },
                                { name: 'Discord', value: `[Discord](${latestPost.discord || ''})`, inline: true },
                                { name: 'Telegram', value: `[Telegram](${latestPost.telegram || ''})`, inline: true }
                            );

                        if (latestPost.image) {
                            const imageUrl = `${process.env.BACKEND_URL}/uploads/${latestPost.image}`;
                            console.log(`Polling Image URL: ${imageUrl}`);
                            embed.setImage(imageUrl);
                        }

                        console.log(`Posting to channel ${channel.name} in guild ${guildId}`);
                        await channel.send({ embeds: [embed] });
                    }
                } else {
                    console.log('No new posts to publish.');
                }
            } else {
                console.log('No posts available during polling.');
            }
        } catch (error) {
            console.error('Error during polling:', error);
        }
    }, 60000); // Poll every 60 seconds
};

startPolling();
