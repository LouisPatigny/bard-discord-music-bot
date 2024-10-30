import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
} from 'discord.js';
import {
    joinVoiceChannel,
    createAudioResource,
    StreamType,
    DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import youtubedl from 'youtube-dl-exec';
import cacheManager from '../utils/cacheManager';
import logger from '../utils/logger';
import config from '../config';
import { Command, QueueItem } from '../utils/types';
import queueManager from '../utils/queueManager';
import {
    extractVideoId,
    isValidYouTubeUrl,
    fetchVideoInfo, searchYouTube,
} from '../utils/youtubeUtils';

// Set paths for ffmpeg and ffprobe
ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('C:/ffmpeg/bin/ffprobe.exe');

const TMP_PATH = path.join(__dirname, '..', 'tmp');
const PREFIX = "**";
const SONG_ADDED = " has been added to the queue!";
const FETCH_FAIL_MSG = "Failed to retrieve video information.";
const VOICE_CHANNEL_ERROR_MSG = "You need to be in a voice channel to play music!";
const INVALID_URL_MSG = "Invalid YouTube URL.";
const RATE_LIMIT_MSG = "Failed to retrieve video information. Rate limits may apply.";
const AUDIO_STREAM_ERROR_MSG = "There was an error creating the audio stream.";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from YouTube')
        .addStringOption((option) =>
            option
                .setName('input')
                .setDescription('The YouTube URL or search query')
                .setRequired(true)
        ) as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const input = interaction.options.getString('input', true);
        const member = interaction.member as GuildMember;

        if (!(await isUserInVoiceChannel(member, interaction))) return;
        if (!(await userHasPermissions(member, interaction))) return;

        await interaction.deferReply();

        let videoId: string | null = null;
        let songInfo: any = null;

        if (isValidYouTubeUrl(input)) {
            videoId = extractVideoId(input);
            if (!videoId) {
                await interaction.editReply({ content: INVALID_URL_MSG });
                return;
            }
        } else {
            // Perform a search
            videoId = await searchYouTube(input);
            if (!videoId) {
                await interaction.editReply({ content: `No results found for "${input}".` });
                return;
            }
        }

        songInfo = await getSongInfo(videoId, interaction);
        if (!songInfo) return;

        await handleAudioResource(songInfo.video_url, songInfo, interaction, member);
    },
};

async function isUserInVoiceChannel(member: GuildMember, interaction: ChatInputCommandInteraction): Promise<boolean> {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
        await interaction.reply({ content: VOICE_CHANNEL_ERROR_MSG, ephemeral: true });
        return false;
    }
    return true;
}

async function userHasPermissions(member: GuildMember, interaction: ChatInputCommandInteraction): Promise<boolean> {
    const voiceChannel = member.voice.channel;
    if (voiceChannel && !voiceChannel.permissionsFor(interaction.client.user!)?.has(['Connect', 'Speak'])) {
        await interaction.reply({ content: "I need permissions to join and speak in your voice channel!", ephemeral: true });
        return false;
    }
    return true;
}

async function getSongInfo(videoId: string, interaction: ChatInputCommandInteraction) {
    let songInfo = cacheManager.get(videoId);

    if (!songInfo) {
        try {
            songInfo = await fetchVideoInfo(videoId);
            if (!songInfo) {
                await interaction.followUp({ content: FETCH_FAIL_MSG, ephemeral: true });
                return null;
            }
            cacheManager.set(videoId, songInfo);
            logger.info(`Cached video info for: ${songInfo.title}`);
        } catch (error) {
            logger.error(FETCH_FAIL_MSG, error);
            await interaction.followUp({ content: RATE_LIMIT_MSG, ephemeral: true });
            return null;
        }
    }
    return songInfo;
}

async function handleAudioResource(url: string, songInfo: any, interaction: ChatInputCommandInteraction, member: GuildMember) {
    try {
        const mp3FilePath = await downloadAndConvert(url);

        if (!fs.existsSync(mp3FilePath)) {
            logger.error('MP3 file does not exist:', mp3FilePath);
            await interaction.followUp({ content: "There was an error with the audio file.", ephemeral: true });
            return;
        }

        const audioStream = fs.createReadStream(mp3FilePath, { highWaterMark: 128 * 1024 }); // Increased buffer size
        audioStream.on('error', (error) => {
            logger.error('Error creating audio stream:', error);
            // Handle the error, e.g., skip to the next song or notify the user
            audioStream.on('error', async (error) => {
                logger.error('Error creating audio stream:', error);
                queueManager.resetQueue(interaction.guildId!);
                await interaction.followUp({content: AUDIO_STREAM_ERROR_MSG, ephemeral: true});
            });
        });

        // Log stream events for troubleshooting
        audioStream.on('end', () => logger.info(`Audio stream ended for ${songInfo.title}`));
        audioStream.on('close', () => logger.info(`Audio stream closed for ${songInfo.title}`));

        const resource = createAudioResource(audioStream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true, // Enables inline volume for stability
            metadata: { title: songInfo.title },
        });

        const song: QueueItem = {
            title: songInfo.title,
            url: songInfo.video_url,
            resource,
        };

        const guildId = interaction.guildId!;
        const queue = queueManager.getQueue(guildId);
        queueManager.addSong(guildId, song);

        if (!queue.playing) {
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                await interaction.followUp({ content: VOICE_CHANNEL_ERROR_MSG, ephemeral: true });
                return;
            }

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: interaction.guild!.voiceAdapterCreator as DiscordGatewayAdapterCreator,
            });

            queue.connection = connection;
            connection.subscribe(queue.player);
            logger.info(`Joined voice channel: ${voiceChannel.name}`);
            await queueManager.playNextSong(guildId);
            await interaction.followUp({ content: `Now playing: ${PREFIX}${song.title}${PREFIX}` });
        } else {
            await interaction.followUp({ content: `${PREFIX}${song.title}${PREFIX}${SONG_ADDED}` });
        }
    } catch (error: any) {
        logger.error('Error in handleAudioResource:', error);
        queueManager.resetQueue(interaction.guildId!);

        let userMessage = AUDIO_STREAM_ERROR_MSG;
        if (error.message.includes('Downloaded file does not exist')) {
            userMessage = 'Failed to download the song. It might be restricted or unavailable.';
        }

        await interaction.followUp({ content: userMessage, ephemeral: true });
    }
}

async function downloadAndConvert(videoUrl: string): Promise<string> {
    const TMP_FORMAT = `output_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const m4aFilePath = path.join(TMP_PATH, `${TMP_FORMAT}.m4a`);
    const mp3FilePath = path.join(TMP_PATH, `${TMP_FORMAT}.mp3`);

    await fsPromises.mkdir(TMP_PATH, { recursive: true });

    for (let attempt = 0; attempt < config.MAX_RETRIES; attempt++) {
        try {
            await youtubedl(videoUrl, {
                extractAudio: true,
                format: 'bestaudio[ext=m4a]',
                audioFormat: 'm4a',
                output: m4aFilePath,
                noWarnings: true,
                ageLimit: 0,
            });

            // Verify that the file exists
            if (!fs.existsSync(m4aFilePath)) {
                logger.error('Downloaded file does not exist.');
            }

            await new Promise<void>((resolve, reject) => {
                ffmpeg(m4aFilePath)
                    .audioBitrate(96)
                    .toFormat('mp3')
                    .on('end', () => resolve())
                    .on('error', (error) => reject(error))
                    .save(mp3FilePath);
            });

            await fsPromises.unlink(m4aFilePath).catch(() => {});

            return mp3FilePath;
        } catch (error: any) {
            logger.warn(
                `Retrying download and convert due to error: ${error.message} (Attempt ${attempt + 1})`
            );
            if (attempt >= config.MAX_RETRIES - 1) throw error;
            await new Promise((res) => setTimeout(res, 1000));
        }
    }
    throw new Error('Failed to download and convert after maximum retries');
}

export default command;
