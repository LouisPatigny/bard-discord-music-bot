// src/commands/queue.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import queueManager from '../utils/queueManager';
import logger from '../utils/logger';
import { Command } from '../utils/types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current song queue'),
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId;

        // Check if guildId is null or undefined
        if (!guildId) {
            await interaction.reply({ content: 'Guild not found.', ephemeral: true });
            return;
        }

        const queue = queueManager.getQueue(guildId);

        // Safeguard against potential null or undefined queue or queue.songs
        if (!queue || !Array.isArray(queue.songs) || queue.songs.length === 0) {
            await interaction.reply({ content: 'The queue is currently empty!', ephemeral: true });
            return;
        }

        const queueDisplay = queue.songs
            .map((song, index) => `${index + 1}. ${song.title}`)
            .slice(0, 10);

        const nowPlaying = queue.songs[0];
        let response = `🎶 **Now Playing:** ${nowPlaying.title}\n\n**Up Next:**\n${queueDisplay.join('\n')}`;

        if (queue.songs.length > 10) {
            response += `\n...and ${queue.songs.length - 10} more.`;
        }

        // Check if the interaction can be replied to
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response);
        } else {
            await interaction.reply(response);
        }

        logger.info(`Displayed queue for ${interaction.user.tag}`);
    },
};

export default command;
