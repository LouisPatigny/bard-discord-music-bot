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
        part: ['snippet', 'status'],
        id: [videoId],
    });

    const items = response.data.items;
    if (!items || items.length === 0) return null;

    const video = items[0];
    if (video.status?.privacyStatus !== 'public') {
        return null; // Video is not publicly available
    }

    return {
        title: video.snippet!.title!,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
    };
};

export const searchYouTube = async (query: string): Promise<string | null> => {
    const response = await youtube.search.list({
        part: ['id'],
        q: query,
        maxResults: 1,
        type: ['video'],
    });

    const items = response.data.items;
    if (!items || items.length === 0) return null;

    const videoId = items[0].id?.videoId;
    return videoId || null;
};