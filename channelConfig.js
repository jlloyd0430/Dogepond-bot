// channelConfig.js
const mongoose = require('mongoose');

const channelConfigSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    dropType: String
});

const ChannelConfig = mongoose.model('ChannelConfig', channelConfigSchema);

module.exports = ChannelConfig;
