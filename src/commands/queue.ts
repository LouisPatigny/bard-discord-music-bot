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

        if (!guildId) {
            await interaction.reply({ content: 'Guild not found.', ephemeral: true });
            return;
        }

        logger.info(`Fetching queue for guildId: ${guildId}`);

        const queue = queueManager.getQueue(guildId);

        if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
            await interaction.reply({
                content: 'The queue is currently empty!',
                ephemeral: true,
            });
            logger.info(`Queue is empty for ${guildId}`);
            return;
        }

        const nowPlaying = queue.currentSong;
        const upcomingSongs = queue.songs.slice(0, 10);

        let response = '';

        if (nowPlaying) {
            response += `🎶 **Now Playing:** ${nowPlaying.title}\n\n`;
        } else {
            response += 'No song is currently playing.\n\n';
        }

        if (upcomingSongs.length > 0) {
            response += '**Up Next:**\n';
            response += upcomingSongs
                .map((song, index) => `${index + 1}. ${song.title}`)
                .join('\n');

            if (queue.songs.length > 10) {
                response += `\n...and ${queue.songs.length - 10} more.`;
            }
        } else {
            response += 'No more songs in the queue.';
        }

        await interaction.reply({ content: response });
        logger.info(`Displayed queue for ${interaction.user.tag} in guildId: ${guildId}`);
    },
};

export default command;
