// src/utils/types.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { AudioResource, VoiceConnection, AudioPlayer } from '@discordjs/voice';

// Interface for a Command
export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Interface for a song in the queue
export interface QueueItem {
    title: string;
    url: string;
    resource: AudioResource;
}

// Interface for the queue
export interface Queue {
    guildId: string;
    connection: VoiceConnection | null;
    player: AudioPlayer;
    songs: QueueItem[];
    currentSong: QueueItem | null;
    playing: boolean;
    isBuffering: boolean;
}
