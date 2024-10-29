// src/commands/clear.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import queueManager from '../utils/queueManager';
import logger from '../utils/logger';
import { Command } from '../utils/types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the song queue'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId;

        if (!guildId) {
            await interaction.reply({ content: 'Guild ID is missing.', ephemeral: true });
            return;
        }

        const queue = queueManager.getQueue(guildId);

        if (!queue || queue.songs.length === 0) {
            await interaction.reply({ content: 'The queue is already empty!', ephemeral: true });
            return;
        }

        try {
            queueManager.resetQueue(guildId);
            await interaction.reply({ content: '🗑️ Queue cleared!' });
            logger.info(`Queue cleared by ${interaction.user.tag} in guild ${guildId}`);
        } catch (error) {
            logger.error('Error clearing queue:', error);
            await interaction.reply({
                content: 'There was an error clearing the queue.',
                ephemeral: true,
            });
        }
    },
};

export default command;
