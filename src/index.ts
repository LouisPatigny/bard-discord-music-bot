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

// Constants
const COMMANDS_PATH = path.join(__dirname, 'commands');
const EVENT_READY = 'ready';
const EVENT_INTERACTION_CREATE = 'interactionCreate';

// Extended Client Interface
interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
}

// Client setup
const client = initializeClient();
client.commands = new Collection<string, Command>();

const rest = new REST({ version: '10' }).setToken(config.token);
const commandFiles = fs.readdirSync(COMMANDS_PATH).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

// Initialize Client
function initializeClient(): ExtendedClient {
    return new Client({
        intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates],
    }) as ExtendedClient;
}

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

// Register Commands
async function registerCommands(commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]): Promise<void> {
    try {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
        logger.info('Commands registered successfully.');
    } catch (error) {
        logger.error('Failed to register commands:', error);
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

// Event Listeners
client.once(EVENT_READY, () => logger.info(`Logged in as ${client.user?.tag}!`));
client.on(EVENT_INTERACTION_CREATE, async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
        await handleCommandInteraction(interaction as ChatInputCommandInteraction);
    }
});

// Initialization
(async () => {
    try {
        await client.login(config.token);
        logger.info('Logged in successfully');
        const commands = await loadCommands();
        await registerCommands(commands);
        logger.info('Initialization completed successfully');
    } catch (error) {
        logger.error('Error during startup:', error);
    }
})();