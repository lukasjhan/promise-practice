export type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
export type PromiseReject = (reason?: any) => void;

export interface PromiseFuture<T> {
  resolve: PromiseResolve<T>;
  reject: PromiseReject;
}

export class Future<T> {
  public future: PromiseFuture<T> | null = null;
  public current: Promise<T> | null = null;

  public promise(reset = false) {
    if (reset) {
      this.reset();
    }
    if (this.current) {
      return this.current;
    }
    return (this.current = new Promise((resolve, reject) => {
      this.future = {
        resolve,
        reject,
      };
    }));
  }

  public resolve(value: T, reset: boolean = true) {
    if (!this.future) {
      throw new Error("No promise");
    }
    this.future.resolve(value);
    if (reset) {
      this.reset();
    }
  }

  public reject(reason: any, reset: boolean = true) {
    if (!this.future) {
      throw new Error("No promise");
    }
    this.future.reject(reason);
    if (reset) {
      this.reset();
    }
  }

  public reset() {
    this.current = null;
    this.future = null;
    return this;
  }
}

export class PromiseChain {
  public promise: Promise<any>;

  constructor() {
    this.promise = Promise.resolve();
  }

  public next<T>(job: () => T | Promise<T>): Promise<T> {
    const wrap = {
      run: () => {},
    };
    const newPromise = new Promise<T>((resolve, reject) => {
      wrap.run = () => {
        try {
          const result = job();
          if (result && result instanceof Promise) {
            return result.then(resolve).catch(reject);
          }
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          return error;
        }
      };
    });
    this.promise = this.promise.then(wrap.run);
    return newPromise;
  }
}

export class JobChainQueue {
  private worker: PromiseChain;
  private currentJob: Future<string>;

  constructor() {
    this.worker = new PromiseChain();
    this.currentJob = new Future<string>();
  }

  public addJob(job: () => Promise<string>, isCanceled: () => boolean) {
    return this.worker.next(async () => {
      const promise = this.currentJob.promise(true);
      if (isCanceled()) {
        this.currentJob.resolve("canceled");
        return promise;
      }
      const result = await job();
      this.currentJob.resolve(result);

      return promise;
    });
  }
}

/**
 * test script
 * 
import { JobChainQueue } from "./promiseChain";

async function testJobQueue() {
  console.log("JobQueue 테스트 시작");

  const queue = new JobChainQueue();

  // 작업 1: 정상 완료되는 작업
  const job1 = () =>
    new Promise<string>((resolve) => {
      console.log("작업 1 시작 (2초 후 완료)");
      setTimeout(() => {
        resolve("1번 계산 결과: 4");
      }, 2000);
    });

  // 작업 2: 바로 취소되는 작업
  const job2 = () =>
    new Promise<string>((resolve) => {
      console.log("작업 2 시작 (1초 후 완료)");
      setTimeout(() => {
        resolve("2번 계산 결과: 9");
      }, 1000);
    });

  // 작업 3: 정상 완료되는 작업
  const job3 = () =>
    new Promise<string>((resolve) => {
      console.log("작업 3 시작 (3초 후 완료)");
      setTimeout(() => {
        resolve("3번 계산 결과: 16");
      }, 3000);
    });

  // 작업 등록
  const j1 = queue.addJob(job1, () => false);
  const j2 = queue.addJob(job2, () => true);
  const j3 = queue.addJob(job3, () => false);

  // 결과 수집
  console.log("모든 작업이 등록되었습니다. 결과를 기다립니다...");
  console.log("작업 1 결과:", await j1);
  console.log("작업 2 결과:", await j2);
  console.log("작업 3 결과:", await j3);
}

// 테스트 실행
testJobQueue().catch((error) => {
  console.error("테스트 중 오류 발생:", error);
});

 */
