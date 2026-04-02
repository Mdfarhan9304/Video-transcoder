import { Queue as BullMQQueue, Job } from "bullmq";
import { Redis } from "ioredis";
import { Worker } from "bullmq";

const connection = new Redis({ maxRetriesPerRequest: null });

class Queue {
  private name: string = "video-process";
  private client: BullMQQueue;

  constructor() {
    this.client = new BullMQQueue(this.name, { connection });
  }
  async add(name: string, data: any) {
    return await this.client.add(name, data);
  }

  worker(handler: (job: Job) => Promise<void>) {
    const worker = new Worker(this.name, handler, { connection });
    worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    });
    worker.on("failed", (job: Job | undefined, error: Error) => {
      if (!job) return;
      console.error(`Job ${job.id} failed: ${error.message}`);
    });
    return worker;
  }
}
const queue = new Queue();

export default queue;
