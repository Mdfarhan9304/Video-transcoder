import queue from "@repo/queue";
import { getFfmpegCommand, UPLOADS_DIR } from "./utils.js";
import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export type TranscodeJobData = {
  /** Multer `filename` under `uploads/` */
  videoId: string;
};

queue.worker(async (job) => {
  if (job.name === "transcode") {
  
    const { videoId } = job.data as TranscodeJobData;
    console.log("[worker] transcode start", job.id, videoId);
    const command = getFfmpegCommand(videoId);
    await new Promise<void>((resolve, reject) => {
      const cmd = exec(command);
      if (!cmd.stdout || !cmd.stderr) {
        reject(new Error("Failed to capture ffmpeg output streams"));
        return;
      }

      cmd.stdout.on("data", (data) => {
        console.log("[worker] transcode stdout", data);
      });
      cmd.stderr.on("data", (data) => {
        console.log("[worker] transcode stderr", data);
      });
      cmd.on("error", reject);
      cmd.on("close", (code) => {
        console.log("[worker] transcode close", code);
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });

    const outDir = path.join(UPLOADS_DIR, `${videoId}_hls`);
    const masterPath = path.join(outDir, "master.m3u8");
    const master = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
`;
    await writeFile(masterPath, master, "utf8");
    console.log("[worker] hls outputs ready", job.id, outDir, masterPath);

  }

});

console.log("Worker started");
