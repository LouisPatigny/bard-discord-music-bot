// src/config.ts
import dotenv from 'dotenv';

dotenv.config();

interface Config {
    token: string;
    clientId: string;
    guildId: string;
    MAX_RETRIES: number;
}

const config: Config = {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    MAX_RETRIES: 10,
};

export default config;
