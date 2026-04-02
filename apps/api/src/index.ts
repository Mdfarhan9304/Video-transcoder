import express from "express";
import multer from "multer";
import queue from "@repo/queue";

const app = express();

app.use(express.json());
const upload = multer({ dest: 'uploads/videos' });
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.post('/upload', upload.single('video'), (req, res) => {

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  console.log(file);
  res.status(200).json({ ok: true });
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

