import { Future } from "./promiseChain";

export type JobOption = {
  delay: number;
  priority: number;
  retry: number;
  attempt: number;
};

export type JobRequestOption = {
  delay?: number;
  priority?: number;
  retry?: number;
  attempt?: number;
};

export type Job<T> = {
  job: () => Promise<T>;
  option: JobOption;
};

export class JobQueue {
  private queue: Job<any>[] = [];
  private waiters: Future<Job<any>>[] = [];

  public addJob<T>(job: () => Promise<T>, option: JobRequestOption = {}) {
    const jobOption: JobOption = {
      delay: option.delay || 0,
      priority: option.priority || 0,
      retry: option.retry || 0,
      attempt: option.attempt || 0,
    };
    this.queue.push({ job, option: jobOption });
    this.queue.sort((a, b) => b.option.priority - a.option.priority);
    this.notify();
  }

  public async getOrWaitForJob(): Promise<Job<any>> {
    const future = new Future<Job<any>>();
    const promise = future.promise();

    this.waiters.push(future);
    this.notify();

    return promise;
  }

  private notify() {
    if (this.queue.length === 0) {
      return;
    }

    while (this.waiters.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      const { option } = job;

      if (option.retry < option.attempt) {
        // if job used all retry attempts, then skip
        continue;
      }

      const future = this.waiters.shift()!;
      if (option.delay === 0) {
        future.resolve(job);
      } else {
        setTimeout(() => {
          future.resolve(job);
        }, option.delay);
      }
    }
  }

  public get length() {
    return this.queue.length;
  }
}

export class Worker {
  public quit: boolean = false;
  constructor(private queue: JobQueue) {}

  public stop() {
    this.quit = true;
  }

  public async start() {
    while (!this.quit) {
      const jobData = await this.queue.getOrWaitForJob();
      const { job, option } = jobData;
      await job().catch(() => {
        if (option.attempt === option.retry) {
          return;
        }
        option.attempt++;
        option.delay = option.delay * option.attempt ** 2;
        this.queue.addJob(job, option);
      });
    }
  }
}

/**
 * test code
 * 
import { JobQueue, Worker } from "./jobQueue";

async function testJobQueue() {
  console.log("JobQueue 테스트 시작");

  const queue = new JobQueue();

  setTimeout(() => {
    queue.addJob(async () => {
      console.log("1");
    });
  }, 1400);

  setTimeout(() => {
    queue.addJob(
      async () => {
        console.log("2");
      },
      { delay: 1500 }
    );
  }, 1000);

  setTimeout(() => {
    queue.addJob(async () => {
      console.log("3");
    });
  }, 3000);

  const worker1 = new Worker(queue);
  worker1.start();

  const worker2 = new Worker(queue);
  worker2.start();
}

// 테스트 실행
testJobQueue().catch((error) => {
  console.error("테스트 중 오류 발생:", error);
});

 */
