// src/commands/debug.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import queueManager from '../utils/queueManager';
import logger from '../utils/logger';
import { Command } from '../utils/types';
import path from 'path';

const TMP_PATH = path.join(__dirname, '..', 'tmp');

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Resets the queue, stops playback, and deletes temporary files'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId;

        if (!guildId) {
            await interaction.reply({ content: 'Guild ID is missing.', ephemeral: true });
            return;
        }

        try {
            const queue = queueManager.getQueue(guildId);
            const totalSongs = queue.songs.length + (queue.currentSong ? 1 : 0);

            // Skip through all songs to ensure file cleanup
            for (let i = 0; i < totalSongs; i++) {
                await queueManager.playNextSong(guildId);
            }

            // Clear the queue and reset playback after skipping all songs
            queueManager.resetQueue(guildId);
            logger.info(`Playback stopped and queue cleared by ${interaction.user.tag} in guild ${guildId}`);

            await interaction.reply({
                content: '🛠️ Debug reset completed: Playback stopped, queue cleared, and all temporary files deleted.',
            });
        } catch (error) {
            logger.error('Error during debug reset:', error);
            await interaction.reply({
                content: 'There was an error performing the debug reset.',
                ephemeral: true,
            });
        }
    },
};

export default command;