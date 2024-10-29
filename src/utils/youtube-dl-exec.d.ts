// src/types/youtube-dl-exec.d.ts
declare module "youtube-dl-exec" {
    const youtubedl: (url: string, options?: Record<string, any>) => Promise<void>;
    export default youtubedl;
}
