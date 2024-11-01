// src/index.ts
import {
    Client,
    Collection,
    IntentsBitField,
    Interaction,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    ChatInputCommandInteraction,
} from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';
import { Command } from './utils/types';
import { loadGuilds, saveGuilds, addGuild, removeGuild } from './utils/guildManager';

// Constants
const COMMANDS_PATH = path.join(__dirname, 'commands');
const EVENT_READY = 'ready';
const EVENT_INTERACTION_CREATE = 'interactionCreate';
const EVENT_GUILD_CREATE = 'guildCreate';
const EVENT_GUILD_DELETE = 'guildDelete';
const INTENTS = [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates];

// Extended Client Interface
interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
}

// Client setup
const client = new Client({ intents: INTENTS }) as ExtendedClient;
client.commands = new Collection<string, Command>();
const rest = new REST({ version: '10' }).setToken(config.token);
const commandFiles = fs.readdirSync(COMMANDS_PATH).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

// Load Commands
async function loadCommands(): Promise<RESTPostAPIChatInputApplicationCommandsJSONBody[]> {
    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    for (const file of commandFiles) {
        const filePath = path.join(COMMANDS_PATH, file);
        const commandModule = await import(filePath);
        const command: Command = commandModule.default;
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody);
    }
    return commands;
}

// Register Commands for a Specific Guild
async function registerCommandsForGuild(guildId: string, commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]): Promise<void> {
    try {
        await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: commands });
        logger.info(`Commands registered successfully for guild ID: ${guildId}`);
    } catch (error) {
        logger.error(`Failed to register commands for guild ID ${guildId}:`, error);
    }
}

// Register Commands for All Guilds
async function registerCommandsForAllGuilds(commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]): Promise<void> {
    const guildData = loadGuilds();
    const guildIds = Object.keys(guildData);

    for (const guildId of guildIds) {
        await registerCommandsForGuild(guildId, commands);
    }
}

// Handle Command Interaction
async function handleCommandInteraction(interaction: ChatInputCommandInteraction) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

// Add Event Listeners to Client
function addEventListeners(client: ExtendedClient, commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]): void {
    client.once(EVENT_READY, () => {
        if (!client.user) {
            logger.error('Client user is not defined!');
            return;
        }
        logger.info(`Logged in as ${client.user.tag}!`);
    });

    client.on(EVENT_INTERACTION_CREATE, async (interaction: Interaction) => {
        if (interaction.isChatInputCommand()) {
            await handleCommandInteraction(interaction as ChatInputCommandInteraction);
        }
    });

    client.on(EVENT_GUILD_CREATE, async (guild) => {
        addGuild(guild);
        await registerCommandsForGuild(guild.id, commands);
    });

    client.on(EVENT_GUILD_DELETE, async (guild) => {
        removeGuild(guild);
        // Removed the command deregistration to prevent "Missing Access" errors
        logger.info(`Bot was removed from guild: ${guild.id} (${guild.name})`);
    });
}

// Initialization
(async () => {
    try {
        await client.login(config.token);
        logger.info('Logged in successfully');

        const commands = await loadCommands();
        const guildData = loadGuilds();

        if (Object.keys(guildData).length === 0) {
            logger.warn('No guilds found. If the bot has already joined guilds, ensure guilds.json is populated correctly.');
        } else {
            await registerCommandsForAllGuilds(commands);
        }

        addEventListeners(client, commands);

        logger.info('Initialization completed successfully');
    } catch (error) {
        logger.error('Error during startup:', error);
    }
})();
