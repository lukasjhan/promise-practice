import React, { useState, useEffect, useRef } from "react";

// Future, PromiseChain, JobQueue 클래스 정의
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

class JobQueue {
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

interface Job {
  id: number;
  name: string;
  duration: number;
  calculation: number;
  status: "pending" | "running" | "completed" | "canceled";
  result: string | null;
  cancelRequested: boolean;
}

const JobQueueManager = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const canceledRef = useRef<number[]>([]);
  const [queue, setQueue] = useState<JobQueue | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    setQueue(new JobQueue());
  }, []);

  const handleStart = () => {
    if (isStarted || !queue) return;

    const newJobs: Job[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Task ${i + 1}`,
      duration: Math.floor(Math.random() * 4 + 4) * 1000, // 4-8s
      calculation: (i + 1) * (i + 1),
      status: "pending",
      result: null,
      cancelRequested: false,
    }));

    setJobs(newJobs);
    setIsStarted(true);

    newJobs.forEach((job) => {
      const jobPromise = queue.addJob(
        () =>
          new Promise<string>((resolve) => {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id ? { ...j, status: "running" } : j
              )
            );

            setTimeout(() => {
              resolve(`${job.name} calculation result: ${job.calculation}`);
            }, job.duration);
          }),
        () => {
          return canceledRef.current.includes(job.id);
        }
      );

      jobPromise.then((result) => {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: result === "canceled" ? "canceled" : "completed",
                  result: result,
                }
              : j
          )
        );
      });
    });
  };

  const handleCancel = (jobId: number) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, cancelRequested: true } : job
      )
    );
    canceledRef.current.push(jobId);
  };

  const handleReset = () => {
    setJobs([]);
    setQueue(new JobQueue());
    setIsStarted(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Job Queue Manager
      </h1>

      <div className="mb-6 flex justify-center space-x-4">
        <button
          onClick={handleStart}
          disabled={isStarted}
          className={`px-4 py-2 rounded-md ${
            isStarted
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Start
        </button>
        <button
          onClick={handleReset}
          disabled={!isStarted}
          className={`px-4 py-2 rounded-md ${
            !isStarted
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {jobs.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Press the [Start] button to create 5 tasks.
          </div>
        )}

        {jobs.map((job) => (
          <div
            key={job.id}
            className={`border p-4 rounded-md ${
              job.status === "running"
                ? "bg-blue-50 border-blue-300"
                : job.status === "completed"
                ? "bg-green-50 border-green-300"
                : job.status === "canceled"
                ? "bg-red-50 border-red-300"
                : "bg-gray-50 border-gray-300"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{job.name}</h3>
                <p className="text-sm text-gray-600">
                  Estimated execution time: {job.duration / 1000}s
                </p>
                <div className="mt-2">
                  <span className="text-sm font-medium">
                    Status:{" "}
                    <span
                      className={
                        job.status === "running"
                          ? "text-blue-600"
                          : job.status === "completed"
                          ? "text-green-600"
                          : job.status === "canceled"
                          ? "text-red-600"
                          : "text-gray-600"
                      }
                    >
                      {job.status === "pending"
                        ? "Waiting"
                        : job.status === "running"
                        ? "Running"
                        : job.status === "completed"
                        ? "Completed"
                        : "Canceled"}
                    </span>
                  </span>
                </div>
                {job.result && (
                  <div className="mt-2 font-medium">Result: {job.result}</div>
                )}
              </div>
              <div>
                {job.status === "pending" && (
                  <button
                    onClick={() => handleCancel(job.id)}
                    disabled={job.cancelRequested}
                    className={`px-3 py-1 rounded ${
                      job.cancelRequested
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                  >
                    {job.cancelRequested ? "Cancel Scheduled" : "Cancel"}
                  </button>
                )}
                {job.status === "running" && (
                  <div className="w-20 h-6 flex items-center justify-center">
                    <div className="animate-pulse text-blue-600">
                      Processing...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobQueueManager;
