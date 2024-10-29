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

        // Debug: Log the current queue status
        logger.info(`Fetching queue for guildId: ${guildId}`);

        const queue = queueManager.getQueue(guildId);

        if (!queue || queue.songs.length === 0) {
            await interaction.reply({
                content: 'The queue is currently empty!',
                ephemeral: true,
            });
            logger.info(`Queue is empty for ${guildId}`);
            return;
        }

        const nowPlaying = queue.songs[0];
        const upcomingSongs = queue.songs.slice(1, 11);

        let response = `🎶 **Now Playing:** ${nowPlaying.title}\n\n`;

        if (upcomingSongs.length > 0) {
            response += '**Up Next:**\n';
            response += upcomingSongs
                .map((song, index) => `${index + 1}. ${song.title}`)
                .join('\n');

            if (queue.songs.length > 11) {
                response += `\n...and ${queue.songs.length - 11} more.`;
            }
        } else {
            response += 'No more songs in the queue.';
        }

        await interaction.reply({ content: response });
        logger.info(`Displayed queue for ${interaction.user.tag} in guildId: ${guildId}`);
    },
};

export default command;
