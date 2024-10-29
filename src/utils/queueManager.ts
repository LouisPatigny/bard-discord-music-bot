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

function initializeQueue(guildId: string): Queue {
    const player = createAudioPlayer();
    const queue: Queue = {
        guildId,
        connection: null,
        player,
        songs: [],
        playing: false,
        isBuffering: false, // New flag for buffering state
    };

    player.on('stateChange', (_, newState) => {
        logger.info(`Player status changed to: ${newState.status} in guild ${guildId}`);

        if (newState.status === AudioPlayerStatus.Playing) {
            queue.playing = true;
            queue.isBuffering = false;  // Reset buffering state when playback starts
            logger.info(`Audio player started playing in guild ${guildId}`);
        } else if (newState.status === AudioPlayerStatus.Idle) {
            if (queue.isBuffering) {
                logger.info(`Buffering state active in guild ${guildId}, not skipping song`);
                queue.isBuffering = false;  // Reset buffering after one Idle state
            } else {
                // Set buffering to true initially to prevent immediate skip
                queue.isBuffering = true;
                setTimeout(() => {
                    if (queue.isBuffering) {
                        queue.isBuffering = false;
                        playNextSong(guildId).catch((error) =>
                            logger.error(`Failed to start next song in guild ${guildId}: ${error.message}`)
                        );
                    }
                }, 2000);  // Buffering delay to handle momentary stream interruptions
            }
        }
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

function getQueue(guildId: string): Queue {
    return queues.get(guildId) || initializeQueue(guildId);
}

function addSong(guildId: string, song: QueueItem): void {
    const queue = getQueue(guildId);
    queue.songs.push(song);
    logger.info(`Added song "${song.title}" to the queue in guild ${guildId}`);
}

async function playNextSong(guildId: string): Promise<void> {
    const queue = getQueue(guildId);
    if (queue.songs.length === 0) {
        queue.playing = false;
        if (queue.connection) {
            queue.connection.destroy();
            queue.connection = null;
        }
        logger.info(`Queue is empty in guild ${guildId}. Playback stopped.`);
        return;
    }
    const nextSong = queue.songs.shift()!;
    try {
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
    queue.playing = false;
    if (queue.connection) {
        queue.connection.destroy();
        queue.connection = null;
    }
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
