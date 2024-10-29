// src/index.ts
import {
    Client,
    Collection,
    IntentsBitField,
    Interaction,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './utils/logger';
import { Command } from './utils/types';

interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
}

const COMMANDS_PATH = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(COMMANDS_PATH).filter(file => file.endsWith('.ts'));

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates] }) as ExtendedClient;
client.commands = new Collection<string, Command>();

const rest = new REST({ version: '10' }).setToken(config.token);

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

async function registerCommands(commands: object[]): Promise<void> {
    try {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
        logger.info('Commands registered successfully.');
    } catch (error) {
        logger.error('Failed to register commands:', error);
    }
}

async function main(): Promise<void> {
    const commands = await loadCommands();
    await registerCommands(commands);
}

client.once('ready', () => logger.info(`Logged in as ${client.user?.tag}!`));

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Now, TypeScript knows that interaction is ChatInputCommandInteraction
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        // Error handling
    }
});

client.login(config.token)
    .then(() => {
        console.log('Logged in successfully');
        main()
            .then(() => {
                console.log('Main function executed successfully');
            })
            .catch(error => {
                console.error('Error executing main function:', error);
            });
    })
    .catch(error => {
        console.error('Error logging in:', error);
    });
