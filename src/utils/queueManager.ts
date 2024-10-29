// src/utils/queueManager.ts
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, VoiceConnection } from '@discordjs/voice';
import config from '../config';
import logger from './logger';
import { QueueItem } from './types';

interface Queue {
    guildId: string;
    connection: VoiceConnection | null;
    player: AudioPlayer;
    songs: QueueItem[];
    playing: boolean;
}

const queues = new Map<string, Queue>();

function initializeQueue(guildId: string): Queue {
    const player = createAudioPlayer();
    const queue: Queue = { guildId, connection: null, player, songs: [], playing: false };

    player.on('stateChange', (oldState, newState) => {
        if (newState.status === AudioPlayerStatus.Playing) {
            queue.playing = true;
            logger.info(`Audio player started playing in guild ${guildId}`);
        } else if (newState.status === AudioPlayerStatus.Idle) {
            logger.info(`Audio player is idle in guild ${guildId}`);
            playNextSong(guildId)
                .then(() => logger.info(`Next song started playing in guild ${guildId}`))
                .catch(error => logger.error(`Failed to start next song in guild ${guildId}: ${error.message}`));
        }
    });

    player.on('error', (error) => {
        logger.error(`Audio player error in guild ${guildId}: ${error.message}`, error);
        handlePlayerError(error, guildId)
            .then(() => logger.info(`Error handled in guild ${guildId}`))
            .catch(err => logger.error(`Failed to handle error in guild ${guildId}: ${err.message}`, err));
    });

    queues.set(guildId, queue);
    return queue;
}

function getQueue(guildId: string): Queue {
    let queue = queues.get(guildId);

    if (!queue) {
        queue = initializeQueue(guildId);
    }

    return queue;
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

const queueManager = { getQueue, addSong, playNextSong, resetQueue };

export default queueManager;
