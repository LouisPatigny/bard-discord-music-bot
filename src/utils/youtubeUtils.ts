// src/utils/youtubeUtils.ts
import { google } from 'googleapis';
import config from '../config';

const youtube = google.youtube({
    version: 'v3',
    auth: config.youtubeApiKey,
});

export const extractVideoId = (url: string): string | null => {
    const match = url.match(
        /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
};

export const isValidYouTubeUrl = (url: string): boolean => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
};

export const fetchVideoInfo = async (videoId: string) => {
    const response = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId],
    });

    const items = response.data.items;
    if (!items || items.length === 0) return null;

    return {
        title: items[0].snippet!.title!,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
    };
};
