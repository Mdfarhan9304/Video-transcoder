import express from "express";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
});

