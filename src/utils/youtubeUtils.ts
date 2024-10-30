// src/utils/youtubeUtils.ts
import { google, youtube_v3 } from 'googleapis';
import config from '../config';

const YOUTUBE_API_KEY = config.youtubeApiKey;

const youtube = google.youtube({
    version: 'v3',
    auth: YOUTUBE_API_KEY,
});

const YOUTUBE_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/;

export interface VideoInfo {
    title: string;
    video_url: string;
}

// Extract Video ID from a YouTube URL
export const extractVideoId = (url: string): string | null => {
    const match = url.match(YOUTUBE_URL_REGEX);
    return match ? match[1] : null;
};

// Validate if the URL is a YouTube URL
export const isValidYouTubeUrl = (url: string): boolean => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
};

// Fetch Video Information from YouTube
export const fetchVideoInfo = async (videoId: string): Promise<VideoInfo | null> => {
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

// Search for a YouTube video by query and return the video ID
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