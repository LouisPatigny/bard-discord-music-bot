// src/utils/queueManager.ts
import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    VoiceConnection,
} from '@discordjs/voice';
import logger from './logger';
import { QueueItem, Queue } from './types';

const queues = new Map<string, Queue>();
const LEAVE_TIMEOUT_DURATION = 300000; // 5 minutes

function initializeQueue(guildId: string): Queue {
    const player = createAudioPlayer();
    const queue: Queue = {
        guildId,
        connection: null,
        player,
        songs: [],
        currentSong: null,
        playing: false,
        isBuffering: false,
        leaveTimeout: null,
    };
    player.on('stateChange', (_, newState) => {
        handleStateChange(newState, guildId, queue);
    });
    player.on('error', (error) => {
        logger.error(`Audio player error in guild ${guildId}: ${error.message}`, error);
        handlePlayerError(error, guildId).catch((err) =>
            logger.error(`Failed to handle error in guild ${guildId}: ${err.message}`, err)
        );
    });
    queues.set(guildId, queue);
    return queue;
}

function handleStateChange(newState: any, guildId: string, queue: Queue): void {
    logger.info(`Player status changed to: ${newState.status} in guild ${guildId}`);
    if (newState.status === AudioPlayerStatus.Playing) {
        queue.playing = true;
        queue.isBuffering = false;
    } else if (newState.status === AudioPlayerStatus.Idle) {
        if (queue.songs.length > 0) {
            setTimeout(() => playNextSong(guildId), 500);
        } else {
            stopQueuePlayback(queue, guildId);
        }
    }
}

function stopQueuePlayback(queue: Queue, guildId: string): void {
    queue.playing = false;
    queue.currentSong = null;
    if (!queue.leaveTimeout) {
        queue.leaveTimeout = setTimeout(() => leaveVoiceChannel(queue, guildId), LEAVE_TIMEOUT_DURATION);
        logger.info(`Started leave timeout in guild ${guildId}`);
    }
}

function leaveVoiceChannel(queue: Queue, guildId: string): void {
    if (queue.connection) {
        queue.connection.destroy();
        queue.connection = null;
    }
    queues.delete(guildId);
    logger.info(`Left the voice channel due to inactivity in guild ${guildId}`);
}

function getQueue(guildId: string): Queue {
    return queues.get(guildId) || initializeQueue(guildId);
}

function addSong(guildId: string, song: QueueItem): void {
    const queue = getQueue(guildId);
    queue.songs.push(song);
    if (queue.leaveTimeout) {
        clearTimeout(queue.leaveTimeout);
        queue.leaveTimeout = null;
        logger.info(`Cleared leave timeout in guild ${guildId}`);
    }
    logger.info(`Added song "${song.title}" to the queue in guild ${guildId}`);
}

async function playNextSong(guildId: string): Promise<void> {
    const queue = getQueue(guildId);
    if (queue.songs.length === 0) {
        queue.currentSong = null;
        logger.info(`Queue is empty in guild ${guildId}. No more songs to play.`);
        return;
    }
    const nextSong = queue.songs.shift();
    if (!nextSong) {
        logger.error(`No song found in queue for guild ${guildId}`);
        return;
    }
    queue.currentSong = nextSong;
    try {
        queue.playing = true;
        queue.player.play(nextSong.resource);
        logger.info(`Now playing "${nextSong.title}" in guild ${guildId}`);
    } catch (error: any) {
        logger.error(`Error playing song "${nextSong.title}": ${error.message}`);
        await handlePlayerError(error, guildId);
    }
}

function resetQueue(guildId: string): void {
    const queue = getQueue(guildId);
    queue.songs = [];
    queue.currentSong = null;
    queue.playing = false;
    if (queue.connection) {
        queue.connection.destroy();
        queue.connection = null;
    }
    if (queue.leaveTimeout) {
        clearTimeout(queue.leaveTimeout);
        queue.leaveTimeout = null;
        logger.info(`Cleared leave timeout in guild ${guildId}`);
    }
    queues.delete(guildId);
    logger.info(`Queue reset in guild ${guildId}`);
}

async function handlePlayerError(error: Error, guildId: string): Promise<void> {
    logger.error(`Handling audio player error in guild ${guildId}: ${error.message}`);
    await playNextSong(guildId);
}

export default {
    getQueue,
    addSong,
    playNextSong,
    resetQueue,
};