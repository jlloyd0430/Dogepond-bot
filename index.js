const { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const axios = require('axios');
const mongoose = require('mongoose');
const ChannelConfig = require('./channelConfig'); // Adjust the path if necessary
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB', err);
});

let latestPostId = null;

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
        const dropType = interaction.options.getString('droptype');
        if (!channel || channel.type !== ChannelType.GuildText) {
            await interaction.reply('Please enter a valid text channel.');
            return;
        }

        try {
            await ChannelConfig.findOneAndUpdate(
                { guildId: interaction.guildId },
                { channelId: channel.id, dropType: dropType },
                { upsert: true, new: true }
            );

            await interaction.reply(`Set the post channel to ${channel.name} for ${dropType} drops`);
        } catch (error) {
            console.error('Error setting channel:', error);
            await interaction.reply('Error setting channel.');
        }
    }

    if (commandName === 'latest') {
        await interaction.deferReply();

        const dropType = interaction.options.getString('droptype');
        try {
            const url = `${process.env.BACKEND_URL}/api/nftdrops/approved?droptype=${dropType}`;
            const response = await axios.get(url);
            const posts = response.data;

            if (posts.length === 0) {
                await interaction.editReply('No posts available.');
                return;
            }

            const latestPost = posts[0];

            const embed = new EmbedBuilder()
                .setTitle(latestPost.projectName)
                .setDescription(latestPost.description || 'No description provided.')
                .addFields(
                    { name: 'Drop Type', value: latestPost.dropType, inline: true },
                    { name: 'Date', value: latestPost.date === 'TBA' ? 'TBA' : new Date(latestPost.date).toLocaleDateString(), inline: true },
                    { name: 'Time', value: latestPost.time, inline: true },
                    { name: 'Supply', value: latestPost.supply.toString(), inline: true },
                    { name: 'Likes', value: latestPost.likes.length.toString(), inline: true }
                );

            if (latestPost.dropType === 'new mint') {
                embed.addFields(
                    { name: 'Price', value: latestPost.price !== undefined ? latestPost.price.toString() : 'N/A', inline: true },
                    { name: 'Whitelist Price', value: latestPost.wlPrice !== undefined ? latestPost.wlPrice.toString() : 'N/A', inline: true }
                );
            } else if (latestPost.dropType === 'auction') {
                embed.addFields(
                    { name: 'Starting Price', value: latestPost.startingPrice !== undefined ? latestPost.startingPrice.toString() : 'N/A', inline: true },
                    { name: 'Marketplace Link', value: latestPost.marketplaceLink ? `[Link](${latestPost.marketplaceLink})` : 'N/A', inline: true }
                );
            } else if (latestPost.dropType === 'airdrop') {
                embed.addFields(
                    { name: 'Project Link', value: latestPost.projectLink ? `[Link](${latestPost.projectLink})` : 'N/A' }
                );
            }

            if (latestPost.website) {
                embed.addFields({ name: 'Website', value: `[Website](${latestPost.website})`, inline: true });
            }
            if (latestPost.xCom) {
                embed.addFields({ name: 'X.com', value: `[X.com](${latestPost.xCom})`, inline: true });
            }
            if (latestPost.telegram) {
                embed.addFields({ name: 'Telegram', value: `[Telegram](${latestPost.telegram})`, inline: true });
            }
            if (latestPost.discord) {
                embed.addFields({ name: 'Discord', value: `[Discord](${latestPost.discord})`, inline: true });
            }

            if (latestPost.image) {
                const imageUrl = latestPost.image;
                embed.setImage(imageUrl);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching posts:', error);
            await interaction.editReply(`Error fetching posts: ${error.message}`);
        }
    }

    if (commandName === 'alldrops') {
        await interaction.deferReply();

        try {
            const url = `${process.env.BACKEND_URL}/api/nftdrops/approved`;
            const response = await axios.get(url);
            const posts = response.data;

            if (posts.length === 0) {
                await interaction.editReply('No posts available.');
                return;
            }

            const embeds = posts.map(post => {
                const embed = new EmbedBuilder()
                    .setTitle(post.projectName)
                    .setDescription(post.description || 'No description provided.')
                    .addFields(
                        { name: 'Drop Type', value: post.dropType, inline: true },
                        { name: 'Date', value: post.date === 'TBA' ? 'TBA' : new Date(post.date).toLocaleDateString(), inline: true },
                        { name: 'Time', value: post.time, inline: true },
                        { name: 'Supply', value: post.supply.toString(), inline: true },
                        { name: 'Likes', value: post.likes.length.toString(), inline: true }
                    );

                if (post.dropType === 'new mint') {
                    embed.addFields(
                        { name: 'Price', value: post.price !== undefined ? post.price.toString() : 'N/A', inline: true },
                        { name: 'Whitelist Price', value: post.wlPrice !== undefined ? post.wlPrice.toString() : 'N/A', inline: true }
                    );
                } else if (post.dropType === 'auction') {
                    embed.addFields(
                        { name: 'Starting Price', value: post.startingPrice !== undefined ? post.startingPrice.toString() : 'N/A', inline: true },
                        { name: 'Marketplace Link', value: post.marketplaceLink ? `[Link](${post.marketplaceLink})` : 'N/A', inline: true }
                    );
                } else if (post.dropType === 'airdrop') {
                    embed.addFields(
                        { name: 'Project Link', value: post.projectLink ? `[Link](${post.projectLink})` : 'N/A' }
                    );
                }

                if (post.website) {
                    embed.addFields({ name: 'Website', value: `[Website](${post.website})`, inline: true });
                }
                if (post.xCom) {
                    embed.addFields({ name: 'X.com', value: `[X.com](${post.xCom})`, inline: true });
                }
                if (post.telegram) {
                    embed.addFields({ name: 'Telegram', value: `[Telegram](${post.telegram})`, inline: true });
                }
                if (post.discord) {
                    embed.addFields({ name: 'Discord', value: `[Discord](${post.discord})`, inline: true });
                }

                if (post.image) {
                    const imageUrl = post.image;
                    embed.setImage(imageUrl);
                }

                return embed;
            });

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

            if (posts.length > 0) {
                const latestPost = posts[0];

                if (latestPost._id !== latestPostId) {
                    latestPostId = latestPost._id;

                    const configs = await ChannelConfig.find();

                    for (const config of configs) {
                        const channel = client.channels.cache.get(config.channelId);
                        const dropType = config.dropType;

                        if (!channel) {
                            console.error(`Channel not found for guild ${config.guildId}`);
                            continue;
                        }

                        if (dropType !== 'any' && latestPost.dropType !== dropType) {
                            console.log(`Skipping post of type ${latestPost.dropType} for guild ${config.guildId} with configured type ${dropType}`);
                            continue;
                        }

                        const embed = new EmbedBuilder()
                            .setTitle(latestPost.projectName)
                            .setDescription(latestPost.description || 'No description provided.')
                            .addFields(
                                { name: 'Drop Type', value: latestPost.dropType, inline: true },
                                { name: 'Date', value: latestPost.date === 'TBA' ? 'TBA' : new Date(latestPost.date).toLocaleDateString(), inline: true },
                                { name: 'Time', value: latestPost.time, inline: true },
                                { name: 'Supply', value: latestPost.supply.toString(), inline: true },
                                { name: 'Likes', value: latestPost.likes.length.toString(), inline: true }
                            );

                        if (latestPost.dropType === 'new mint') {
                            embed.addFields(
                                { name: 'Price', value: latestPost.price !== undefined ? latestPost.price.toString() : 'N/A', inline: true },
                                { name: 'Whitelist Price', value: latestPost.wlPrice !== undefined ? latestPost.wlPrice.toString() : 'N/A', inline: true }
                            );
                        } else if (latestPost.dropType === 'auction') {
                            embed.addFields(
                                { name: 'Starting Price', value: latestPost.startingPrice !== undefined ? latestPost.startingPrice.toString() : 'N/A', inline: true },
                                { name: 'Marketplace Link', value: latestPost.marketplaceLink ? `[Link](${latestPost.marketplaceLink})` : 'N/A', inline: true }
                            );
                        } else if (latestPost.dropType === 'airdrop') {
                            embed.addFields(
                                { name: 'Project Link', value: latestPost.projectLink ? `[Link](${latestPost.projectLink})` : 'N/A' }
                            );
                        }

                        if (latestPost.website) {
                            embed.addFields({ name: 'Website', value: `[Website](${latestPost.website})`, inline: true });
                        }
                        if (latestPost.xCom) {
                            embed.addFields({ name: 'X.com', value: `[X.com](${latestPost.xCom})`, inline: true });
                        }
                        if (latestPost.telegram) {
                            embed.addFields({ name: 'Telegram', value: `[Telegram](${latestPost.telegram})`, inline: true });
                        }
                        if (latestPost.discord) {
                            embed.addFields({ name: 'Discord', value: `[Discord](${latestPost.discord})`, inline: true });
                        }

                        if (latestPost.image) {
                            const imageUrl = latestPost.image;
                            embed.setImage(imageUrl);
                        }

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
