import express from "express";
import multer from "multer";
import queue from "@repo/queue";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads");

app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));
const upload = multer({ dest: UPLOADS_DIR });
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.post("/upload", upload.single("video"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const job = await queue.add("transcode", { videoId: file.filename });
  res.status(202).json({
    ok: true,
    jobId: job.id,
    videoId: file.filename,
    path: file.path,
  });
});

app.post("/queue/test", async (_req, res) => {
  const job = await queue.add("test", { hello: "world", at: Date.now() });
  res.status(202).json({ ok: true, jobId: job.id });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
});

