import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Matches multer `dest: "uploads"` when API cwd is repo root */
export const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads");

// const execFileAsync = promisify(execFile);

// export const THUMB_WIDTH = 160;
// export const THUMB_HEIGHT = 90;
// export const TILE_PADDING = 2;
// export const TILE_MARGIN = 2;
// export const TILE_COLS = 10;
// export const TILE_CELL_W = THUMB_WIDTH + TILE_PADDING;
// export const TILE_CELL_H = THUMB_HEIGHT + TILE_PADDING;
// export const THUMB_INTERVAL = 5;

// function runFfmpeg(args: string[]): Promise<void> {
//   return new Promise((resolve, reject) => {
//     const child = spawn("ffmpeg", args, { stdio: "inherit" });
//     child.on("error", reject);
//     child.on("close", (code) => {
//       if (code === 0) resolve();
//       else reject(new Error(`ffmpeg exited with code ${code}`));
//     });
//   });
// }

// async function probeDurationSeconds(inputPath: string): Promise<number> {
//   const { stdout } = await execFileAsync("ffprobe", [
//     "-v",
//     "error",
//     "-show_entries",
//     "format=duration",
//     "-of",
//     "default=noprint_wrappers=1:nokey=1",
//     inputPath,
//   ]);
//   const d = Number.parseFloat(stdout.trim());
//   if (!Number.isFinite(d)) {
//     throw new Error("Could not read duration from ffprobe");
//   }
//   return d;
// }

export const getFfmpegCommand = (videoId: string) => {
  const input = path.join(UPLOADS_DIR, videoId);
  const outDir = path.join(UPLOADS_DIR, `${videoId}_hls`);

  return `mkdir -p ${outDir} && ffmpeg -i ${input} \\
    -filter_complex "[0:v]split=3[v360][v720][v1080]; \\
      [v360]scale=-2:360[out360]; \\
      [v720]scale=-2:720[out720]; \\
      [v1080]scale=-2:1080[out1080]" \\
    -map "[out360]" -map 0:a? -c:v libx264 -preset fast -crf 28 -c:a aac \\
      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "${outDir}/360p_%03d.ts" "${outDir}/360p.m3u8" \\
    -map "[out720]" -map 0:a? -c:v libx264 -preset fast -crf 23 -c:a aac \\
      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "${outDir}/720p_%03d.ts" "${outDir}/720p.m3u8" \\
    -map "[out1080]" -map 0:a? -c:v libx264 -preset fast -crf 20 -c:a aac \\
      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "${outDir}/1080p_%03d.ts" "${outDir}/1080p.m3u8"`;
};

export function getMp4Commands(videoId: string): {
  inputPath: string;
  outDir: string;
  outputs: { label: "360p" | "720p" | "1080p"; path: string; command: string }[];
} {
  const inputPath = path.join(UPLOADS_DIR, videoId);
  const outDir = path.join(UPLOADS_DIR, `${videoId}_mp4`);

  const make = (label: "360p" | "720p" | "1080p", height: number, crf: number) => {
    const outPath = path.join(outDir, `${label}.mp4`);
    const command = `mkdir -p ${outDir} && ffmpeg -y -i ${inputPath} ` +
      `-map 0:v:0 -map 0:a? ` +
      `-vf "scale=-2:${height}" ` +
      `-c:v libx264 -preset fast -crf ${crf} ` +
      `-c:a aac -b:a 128k ` +
      `-movflags +faststart ` +
      `${outPath}`;
    return { label, path: outPath, command };
  };

  return {
    inputPath,
    outDir,
    outputs: [
      make("360p", 360, 28),
      make("720p", 720, 23),
      make("1080p", 1080, 20),
    ],
  };
}

// export const getThumbnailCommand = (videoId: string, duration: number) => {
//   const input = path.join(UPLOADS_DIR, videoId);
//   const outDir = path.join(UPLOADS_DIR, `${videoId}_hls`);
//   const spritePath = path.join(outDir, "thumbnails.jpg");
//   const thumbCount = Math.max(1, Math.ceil(duration / THUMB_INTERVAL));
//   const rows = Math.max(1, Math.ceil(thumbCount / TILE_COLS));

//   return `mkdir -p ${outDir} && ffmpeg -y -i ${input} \\
//     -vf "fps=1/${THUMB_INTERVAL},scale=${THUMB_WIDTH}:${THUMB_HEIGHT},tile=${TILE_COLS}x${rows}:padding=${TILE_PADDING}:margin=${TILE_MARGIN}" \\
//     -frames:v 1 \\
//     -update 1 \\
//     -q:v 4 ${spritePath}`;
// };

// function formatVttTime(seconds: number): string {
//   const h = Math.floor(seconds / 3600);
//   const m = Math.floor((seconds % 3600) / 60);
//   const s = Math.floor(seconds % 60);
//   const ms = Math.round((seconds % 1) * 1000);
//   return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
// }

// export const generateThumbnailVtt = (duration: number) => {
//   const thumbCount = Math.max(1, Math.ceil(duration / THUMB_INTERVAL));

//   let vtt = "WEBVTT\n\n";

//   for (let i = 0; i < thumbCount; i++) {
//     const startTime = i * THUMB_INTERVAL;
//     const endTime = Math.min(startTime + THUMB_INTERVAL, duration);
//     const col = i % TILE_COLS;
//     const row = Math.floor(i / TILE_COLS);

//     const x = TILE_MARGIN + col * TILE_CELL_W;
//     const y = TILE_MARGIN + row * TILE_CELL_H;

//     const startFormatted = formatVttTime(startTime);
//     const endFormatted = formatVttTime(endTime);

//     vtt += `${startFormatted} --> ${endFormatted}\n`;
//     vtt += `thumbnails.jpg#xywh=${x},${y},${THUMB_WIDTH},${THUMB_HEIGHT}\n\n`;
//   }

//   return vtt;
// };

// export const getMasterPlaylist = (_videoId: string) => {
//   return `#EXTM3U
// #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
// 360p.m3u8
// #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
// 720p.m3u8
// #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
// 1080p.m3u8`;
// };

// function buildHlsFfmpegArgs(videoId: string): { args: string[]; outDir: string } {
//   const input = path.join(UPLOADS_DIR, videoId);
//   const outDir = path.join(UPLOADS_DIR, `${videoId}_hls`);

//   const filterComplex =
//     "[0:v]split=3[v360][v720][v1080];" +
//     "[v360]scale=-2:360[out360];" +
//     "[v720]scale=-2:720[out720];" +
//     "[v1080]scale=-2:1080[out1080]";

//   const args: string[] = [
//     "-y",
//     "-i",
//     input,
//     "-filter_complex",
//     filterComplex,
//     "-map",
//     "[out360]",
//     "-map",
//     "0:a",
//     "-c:v",
//     "libx264",
//     "-preset",
//     "fast",
//     "-crf",
//     "28",
//     "-c:a",
//     "aac",
//     "-hls_time",
//     "6",
//     "-hls_playlist_type",
//     "vod",
//     "-hls_segment_filename",
//     path.join(outDir, "360p_%03d.ts"),
//     path.join(outDir, "360p.m3u8"),
//     "-map",
//     "[out720]",
//     "-map",
//     "0:a",
//     "-c:v",
//     "libx264",
//     "-preset",
//     "fast",
//     "-crf",
//     "23",
//     "-c:a",
//     "aac",
//     "-hls_time",
//     "6",
//     "-hls_playlist_type",
//     "vod",
//     "-hls_segment_filename",
//     path.join(outDir, "720p_%03d.ts"),
//     path.join(outDir, "720p.m3u8"),
//     "-map",
//     "[out1080]",
//     "-map",
//     "0:a",
//     "-c:v",
//     "libx264",
//     "-preset",
//     "fast",
//     "-crf",
//     "20",
//     "-c:a",
//     "aac",
//     "-hls_time",
//     "6",
//     "-hls_playlist_type",
//     "vod",
//     "-hls_segment_filename",
//     path.join(outDir, "1080p_%03d.ts"),
//     path.join(outDir, "1080p.m3u8"),
//   ];

//   return { args, outDir };
// }

// function buildThumbnailFfmpegArgs(
//   videoId: string,
//   duration: number,
// ): { args: string[]; spritePath: string } {
//   const input = path.join(UPLOADS_DIR, videoId);
//   const outDir = path.join(UPLOADS_DIR, `${videoId}_hls`);
//   const spritePath = path.join(outDir, "thumbnails.jpg");
//   const thumbCount = Math.max(1, Math.ceil(duration / THUMB_INTERVAL));
//   const rows = Math.max(1, Math.ceil(thumbCount / TILE_COLS));

//   const vf = [
//     `fps=1/${THUMB_INTERVAL}`,
//     `scale=${THUMB_WIDTH}:${THUMB_HEIGHT}`,
//     `tile=${TILE_COLS}x${rows}:padding=${TILE_PADDING}:margin=${TILE_MARGIN}`,
//   ].join(",");

//   const args = [
//     "-y",
//     "-i",
//     input,
//     "-vf",
//     vf,
//     "-frames:v",
//     "1",
//     "-update",
//     "1",
//     "-q:v",
//     "4",
//     spritePath,
//   ];

//   return { args, spritePath };
// }

// export async function runHlsTranscode(videoId: string): Promise<{ outDir: string }> {
//   const { args, outDir } = buildHlsFfmpegArgs(videoId);
//   await mkdir(outDir, { recursive: true });
//   console.log("[hls]", getFfmpegCommand(videoId));
//   await runFfmpeg(args);
//   return { outDir };
// }

// export async function processVideo(videoId: string): Promise<{
//   outDir: string;
//   masterPath: string;
//   thumbnailsJpg: string;
//   thumbnailsVtt: string;
// }> {
//   const { outDir } = await runHlsTranscode(videoId);

//   const masterPath = path.join(outDir, "master.m3u8");
//   await writeFile(masterPath, getMasterPlaylist(videoId), "utf8");

//   const input = path.join(UPLOADS_DIR, videoId);
//   const duration = await probeDurationSeconds(input);

//   console.log("[thumb]", getThumbnailCommand(videoId, duration));

//   const { args: thumbArgs, spritePath: thumbnailsJpg } = buildThumbnailFfmpegArgs(
//     videoId,
//     duration,
//   );
//   await runFfmpeg(thumbArgs);

//   const thumbnailsVtt = path.join(outDir, "thumbnails.vtt");
//   await writeFile(thumbnailsVtt, generateThumbnailVtt(duration), "utf8");

//   return { outDir, masterPath, thumbnailsJpg, thumbnailsVtt };
// }
