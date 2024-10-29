// src/utils/types.ts
import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {AudioResource} from "@discordjs/voice";

// Interface for a Command
export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Queue Interface
export interface QueueItem {
    title: string;
    url: string;
    resource: AudioResource;
}
