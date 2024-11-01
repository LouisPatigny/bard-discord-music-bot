# Discord Music Bot - Technical Documentation

_A comprehensive technical guide for the Discord Music Bot built with TypeScript and discord.js.  
This documentation is intended for developers maintaining or extending the bot,  
providing an in-depth understanding of its architecture, components, and workflows._

---

## Table of Contents
- [Technologies Used](#technologies-used)
- [Project Structure Summary](#project-structure-summary)
- [Required Environment Variables](#required-environment-variables)
- [Technical Details](#technical-details)
- [Dependencies Glossary](#dependencies-glossary)
- [Logging](#logging)
- [Contact](#contact)

---

## Technologies Used

- **Node.js** (v20)
- **TypeScript**
- **discord.js**
- **@discordjs/voice**
- **youtube-dl-exec**
- **fluent-ffmpeg**
- **winston**
- **dotenv**

---

## Project Structure Summary

```
discord-music-bot/
├── src/
│   ├── commands/
│   │   ├── clear.ts
│   │   ├── play.ts
│   │   ├── queue.ts
│   │   └── skip.ts
│   ├── utils/
│   │   ├── cacheManager.ts
│   │   ├── guildManager.ts
│   │   ├── logger.ts
│   │   ├── queueManager.ts
│   │   ├── types.ts
│   │   ├── youtube-dl-exec.d.ts
│   │   └── youtubeUtils.ts
│   ├── config.ts
│   ├── index.ts
├── tmp/
│   └── ... (temporary mp3 files)
├── .env
├── .gitignore
├── combined.log
├── error.log
├── guilds.json
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
```

- **src/**: Contains all source code.
- **commands/**: Individual command modules.
- **utils/**: Utility modules for caching, guild management, logging, and queue management.
- **types/**: Custom TypeScript type definitions.
- **tmp/**: Directory for storing temporary mp3 files during playback.
- **guilds.json**: Stores guild-specific data.
- **package.json**: Node.js project configuration.
- **tsconfig.json**: TypeScript compiler configuration.
- **README.md**: Documentation file.

---

## Required Environment Variables

To run this bot, create a `.env` file with the following variables:

```plaintext
DISCORD_TOKEN=[YOUR DISCORD TOKEN]     # Obtain from Discord Developer Portal
CLIENT_ID=[YOUR CLIENT ID]             # Obtain from Discord Developer Portal
(Optional) YOUTUBE_API_KEY=[YOUR YOUTUBE API KEY] # Obtain from Google Cloud Console
```

---

## Technical Details

### `src/config.ts`
Manages configuration settings by reading from environment variables.

### `guilds.json`
Stores guild-specific data and is managed automatically by `guildManager.ts`.

### `src/index.ts`
Initializes the Discord client, loads commands, registers them with Discord, and sets up event listeners.

#### Key Responsibilities:
- **Client Initialization**: Sets up the Discord client with necessary intents and a commands collection.
- **Command Loading**: Dynamically imports all command files and registers commands with Discord using the REST API.
- **Event Handling**:
    - `ready`: Logs when the bot is connected and ready.
    - `interactionCreate`: Listens for command interactions and delegates execution to the appropriate handler.
    - `guildCreate` / `guildDelete`: Manages the addition and removal of guilds from `guilds.json`.

### Command Handling
Commands are modularized within `src/commands/`, with each command exporting a `Command` object that includes command data and an execution function.

#### Responsibilities:
- **Command Registration**: Defines commands, such as `/play` with required input parameters.
- **Command Execution**: Validates permissions and status, fetches song information, manages audio playback, and cleans up temporary files.

---

## Utility Modules

### `src/utils/guildManager.ts`
Manages guilds in `guilds.json`, handling command registration and deregistration.

#### Key Functions:
- **Guild Addition/Removal**: Adds or removes guilds in `guilds.json` when the bot joins or leaves a guild.

### `src/utils/cacheManager.ts`
Implements in-memory caching to store song information, reducing redundant API calls.

#### Key Functions:
- **Cache Operations**:
    - `set`: Adds entries with expiration.
    - `get`: Retrieves entries.
    - `clear`: Clears the entire cache.

### `src/utils/queueManager.ts`
Handles song queues per guild, including adding songs, managing playback, and clearing queues.

#### Key Functions:
- **Queue Management**: Manages song addition, playback, and disconnection after queue completion.

---

## `src/commands/play.ts`

Handles downloading audio from YouTube, converting to mp3, streaming to the voice channel, and cleaning up temporary files.

#### Key Responsibilities:
- **Audio Download & Conversion**: Downloads audio with `youtube-dl-exec`, converts it using `fluent-ffmpeg`, and cleans up intermediate files.
- **Streaming Audio**: Streams audio to the voice channel and manages playback events.
- **Cleanup**: Deletes mp3 files post-playback to maintain a clean `tmp` folder.

---

## Dependencies Glossary

### Production Dependencies
- `@discordjs/builders`: Tools for building Discord interactions.
- `@discordjs/rest`: REST API client for Discord.
- `@discordjs/voice`: Voice connection and audio playback.
- `discord-api-types`: Discord API type definitions.
- `discord.js`: Discord API wrapper.
- `dotenv`: Loads environment variables.
- `ffmpeg-static`: Static FFmpeg binary.
- `ffprobe`: FFmpeg probe tool.
- `fluent-ffmpeg`: FFmpeg wrapper.
- `googleapis`: Google API client.
- `libsodium-wrappers`: Cryptography library.
- `opusscript`: Opus encoder for voice.
- `prism-media`: Audio stream utilities.
- `winston`: Logging library.
- `youtube-dl-exec`: YouTube downloader.

### Development Dependencies
- `@types/fluent-ffmpeg`, `@types/node`, `@types/winston`: Type definitions.
- `ts-node`: TypeScript execution.
- `typescript`: TypeScript language.

---

## Logging

The bot uses `winston` for structured and leveled logging, providing insights into operations and aiding debugging.

#### Features:
- **File Logging**:
    - `error.log`: Logs error-level messages.
    - `combined.log`: Logs all message levels.
- **Console Logging**: Active in development for real-time monitoring with colorized formatting.
- **Log Levels**:
    - `error`: Critical issues.
    - `warn`: Non-critical issues.
    - `info`: General operations.
    - `debug`: Detailed debugging info (can be enabled as needed).

---

## Contact

For any questions or support, feel free to reach out:

- **GitHub**: [LouisPatigny](https://github.com/LouisPatigny)
- **Email**: patignylouis@gmail.com

---

Thank you for using Bard! 🎶
