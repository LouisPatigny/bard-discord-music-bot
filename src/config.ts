// src/config.ts
import dotenv from 'dotenv';

dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID, YOUTUBE_API_KEY } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !YOUTUBE_API_KEY) {
    throw new Error('Missing required environment variables.');
}

const config = {
    token: DISCORD_TOKEN,
    clientId: CLIENT_ID,
    youtubeApiKey: YOUTUBE_API_KEY,
    MAX_RETRIES: 10,
};

export default config;
