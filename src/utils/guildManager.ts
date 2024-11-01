// src/utils/guildManager.ts
import fs from 'fs';
import path from 'path';
import { Guild } from 'discord.js';
import logger from './logger';

// Path to the guild storage file
const GUILD_STORAGE_PATH = path.join(__dirname, '..', '..', 'guilds.json');

// Load guilds from the storage file
export const loadGuilds = (): Record<string, any> => {
    try {
        if (!fs.existsSync(GUILD_STORAGE_PATH)) {
            fs.writeFileSync(GUILD_STORAGE_PATH, '{}', 'utf8');
        }
        const data = fs.readFileSync(GUILD_STORAGE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to load guilds:', error);
        return {};
    }
};

// Save guilds to the storage file
export const saveGuilds = (data: Record<string, any>): void => {
    try {
        fs.writeFileSync(GUILD_STORAGE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        logger.error('Failed to save guilds:', error);
    }
};

// Add a new guild to the storage
export const addGuild = (guild: Guild): void => {
    const guildData = loadGuilds();
    if (!guildData[guild.id]) {
        guildData[guild.id] = {
            // Initialize any default guild-specific settings here
            // Example:
            // prefix: '!',
        };
        saveGuilds(guildData);
        logger.info(`Added new guild: ${guild.name} (${guild.id})`);
    }
};

// Remove a guild from the storage
export const removeGuild = (guild: Guild): void => {
    const guildData = loadGuilds();
    if (guildData[guild.id]) {
        delete guildData[guild.id];
        saveGuilds(guildData);
        logger.info(`Removed guild: ${guild.name} (${guild.id})`);
    }
};
