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

// Job 타입 정의
interface Job {
  id: number;
  name: string;
  duration: number;
  calculation: number;
  status: "pending" | "running" | "completed" | "canceled";
  result: string | null;
  cancelRequested: boolean;
}

// 메인 컴포넌트
const JobQueueManager = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const canceledRef = useRef<number[]>([]);
  const [queue, setQueue] = useState<JobQueue | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  // 컴포넌트 마운트 시 JobQueue 초기화
  useEffect(() => {
    setQueue(new JobQueue());
  }, []);

  // 작업 시작 핸들러
  const handleStart = () => {
    if (isStarted || !queue) return;

    // 5개의 작업 생성
    const newJobs: Job[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `작업 ${i + 1}`,
      duration: Math.floor(Math.random() * 4 + 4) * 1000, // 4-8초 랜덤 지속 시간
      calculation: (i + 1) * (i + 1), // 결과는 i의 제곱
      status: "pending",
      result: null,
      cancelRequested: false,
    }));

    setJobs(newJobs);
    setIsStarted(true);

    // 각 작업 큐에 추가 및 상태 업데이트
    newJobs.forEach((job) => {
      const jobPromise = queue.addJob(
        () =>
          new Promise<string>((resolve) => {
            // 작업 시작 상태 업데이트
            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id ? { ...j, status: "running" } : j
              )
            );

            setTimeout(() => {
              resolve(`${job.name} 계산 결과: ${job.calculation}`);
            }, job.duration);
          }),
        () => {
          // 현재 작업의 취소 상태 확인
          console.log(canceledRef.current);
          return canceledRef.current.includes(job.id);
        }
      );

      // 작업 완료 시 상태 업데이트
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

  // 작업 취소 핸들러
  const handleCancel = (jobId: number) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, cancelRequested: true } : job
      )
    );
    canceledRef.current.push(jobId);
  };

  // 작업 리셋 핸들러
  const handleReset = () => {
    setJobs([]);
    setQueue(new JobQueue());
    setIsStarted(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
        작업 큐 관리자
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
          시작
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
          리셋
        </button>
      </div>

      <div className="space-y-4">
        {jobs.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            [시작] 버튼을 누르면 5개의 작업이 생성됩니다.
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
                  예상 실행 시간: {job.duration / 1000}초
                </p>
                <div className="mt-2">
                  <span className="text-sm font-medium">
                    상태:{" "}
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
                        ? "대기 중"
                        : job.status === "running"
                        ? "실행 중"
                        : job.status === "completed"
                        ? "완료됨"
                        : "취소됨"}
                    </span>
                  </span>
                </div>
                {job.result && (
                  <div className="mt-2 font-medium">결과: {job.result}</div>
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
                    {job.cancelRequested ? "취소 예약됨" : "취소"}
                  </button>
                )}
                {job.status === "running" && (
                  <div className="w-20 h-6 flex items-center justify-center">
                    <div className="animate-pulse text-blue-600">
                      처리 중...
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
