// src/commands/skip.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import queueManager from '../utils/queueManager';
import logger from '../utils/logger';
import { Command } from '../utils/types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the currently playing song'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId;

        if (!guildId) {
            await interaction.reply({
                content: 'Unable to identify the server.',
                ephemeral: true,
            });
            return;
        }

        const queue = queueManager.getQueue(guildId);

        if (!queue.playing || !queue.currentSong) {
            await interaction.reply({
                content: 'No song is currently playing to skip!',
                ephemeral: true,
            });
            return;
        }

        try {
            if (queue.songs.length === 0) {
                // Stop the player and reset the queue
                queue.player.stop();
                queueManager.resetQueue(guildId);
                await interaction.reply({
                    content: '⏹️ Skipped the song and stopped playback. No more songs in the queue.',
                });
                logger.info(`Playback stopped in guild ${guildId} by ${interaction.user.tag}`);
            } else {
                await queueManager.playNextSong(guildId);
                await interaction.reply({ content: '⏭️ Skipped to the next song!' });
                logger.info(`Skipped song at the request of ${interaction.user.tag}`);
            }
        } catch (error) {
            logger.error(`Error skipping song: ${error}`);
            await interaction.reply({
                content: 'There was an error trying to skip the song.',
                ephemeral: true,
            });
        }
    },
};

export default command;
