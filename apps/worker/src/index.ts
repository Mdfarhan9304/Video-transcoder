import queue from "@repo/queue";

queue.worker(async (job) => {
  console.log("[worker] received job", job.id, job.name, job.data);
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

console.log("Worker started");