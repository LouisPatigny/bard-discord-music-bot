// src/commands/play.ts
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import {
    joinVoiceChannel,
    createAudioResource,
    StreamType,
    DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import youtubedl from 'youtube-dl-exec';
import * as cacheManager from '../utils/cacheManager';
import logger from '../utils/logger';
import config from '../config';
import { Command, QueueItem } from '../utils/types';
import { google } from 'googleapis';
import queueManager from "../utils/queueManager";

const TMP_PATH = path.join(__dirname, '..', 'tmp');

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from YouTube')
        .addStringOption((option) =>
            option
                .setName('url')
                .setDescription('The URL of the YouTube video')
                .setRequired(true)
        ) as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const url = interaction.options.getString('url', true);
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                content: 'You need to be in a voice channel to play music!',
                ephemeral: true,
            });
            return;
        }

        if (
            !voiceChannel.permissionsFor(interaction.client.user!)?.has(['Connect', 'Speak'])
        ) {
            await interaction.reply({
                content: 'I need permissions to join and speak in your voice channel!',
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        if (!isValidYouTubeUrl(url)) {
            await interaction.followUp({
                content: 'Please provide a valid YouTube URL.',
                ephemeral: true,
            });
            return;
        }

        const videoId = extractVideoId(url);

        if (!videoId) {
            await interaction.followUp({
                content: 'Invalid YouTube URL.',
                ephemeral: true,
            });
            return;
        }

        let songInfo = cacheManager.get(videoId);

        if (!songInfo) {
            try {
                songInfo = await fetchVideoInfo(url);
                if (!songInfo) {
                    await interaction.followUp({
                        content: 'Failed to retrieve video information. Try again later.',
                        ephemeral: true,
                    });
                    return;
                }
                cacheManager.set(videoId, songInfo);
                logger.info(`Cached video info for: ${songInfo.videoDetails.title}`);
            } catch (error) {
                logger.error('Failed to fetch video information:', error);
                await interaction.followUp({
                    content: 'Failed to retrieve video information. Rate limits may apply.',
                    ephemeral: true,
                });
                return;
            }
        }

        try {
            const mp3FilePath = await downloadAndConvert(url);

            const audioStream = fs.createReadStream(mp3FilePath);

            const resource = createAudioResource(audioStream, {
                inputType: StreamType.Arbitrary,
                metadata: { title: songInfo.videoDetails.title },
            });

            const song: QueueItem = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
                resource,
            };

            const guildId = interaction.guildId!;
            const queue = queueManager.getQueue(guildId);
            queueManager.addSong(guildId, song);

            if (!queue.playing) {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: interaction.guild!
                        .voiceAdapterCreator as DiscordGatewayAdapterCreator,
                });

                queue.connection = connection;
                connection.subscribe(queue.player);
                logger.info(`Joined voice channel: ${voiceChannel.name}`);
                await queueManager.playNextSong(guildId);
                await interaction.followUp({ content: `Now playing: **${song.title}**` });
            } else {
                await interaction.followUp({
                    content: `**${song.title}** has been added to the queue!`,
                });
            }
        } catch (error) {
            logger.error('Error creating an audio stream:', error);
            queueManager.resetQueue(interaction.guildId!);
            await interaction.followUp({
                content: 'There was an error creating the audio stream.',
                ephemeral: true,
            });
        }
    },
};

async function downloadAndConvert(videoUrl: string): Promise<string> {
    const uniqueId = `${Date.now()}`;
    const m4aFilePath = path.join(TMP_PATH, `output_${uniqueId}.m4a`);
    const mp3FilePath = path.join(TMP_PATH, `output_${uniqueId}.mp3`);

    await fsPromises.mkdir(TMP_PATH, { recursive: true });

    for (let attempt = 0; attempt < config.MAX_RETRIES; attempt++) {
        try {
            await youtubedl(videoUrl, {
                extractAudio: true,
                format: 'bestaudio[ext=m4a]',
                audioFormat: 'm4a',
                output: m4aFilePath,
            });

            await new Promise<void>((resolve, reject) => {
                ffmpeg(m4aFilePath)
                    .audioBitrate(128)
                    .toFormat('mp3')
                    .on('end', () => resolve())
                    .on('error', (error) => reject(error))
                    .save(mp3FilePath);
            });

            await fsPromises.unlink(m4aFilePath).catch(() => {});
            return mp3FilePath;
        } catch (error: any) {
            logger.warn(
                `Retrying download and convert due to error: ${error.message} (Attempt ${
                    attempt + 1
                })`
            );
            if (attempt >= config.MAX_RETRIES - 1) throw error;
            await new Promise((res) => setTimeout(res, 1000));
        }
    }

    throw new Error('Failed to download and convert after maximum retries');
}

const fetchVideoInfo = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    const youtube = google.youtube({
        version: 'v3',
        auth: process.env.YOUTUBE_API_KEY,
    });
    const response = await youtube.videos.list({ part: ['snippet'], id: [videoId] });

    const items = response.data?.items;
    if (!items || items.length === 0) return null;

    return {
        videoDetails: {
            title: items[0].snippet!.title!,
            video_url: url,
        },
    };
};

const extractVideoId = (url: string): string | null => {
    const match = url.match(
        /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
};

const isValidYouTubeUrl = (url: string): boolean => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
};

export default command;
