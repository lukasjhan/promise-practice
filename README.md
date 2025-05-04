# Job Queue Test [Interview Exercise]

## Overview

In this challenge, you will implement a sequential promise queue system that ensures promises are executed one after another rather than concurrently. You will create a job management system that can add, execute, and cancel jobs in a controlled manner.

## Example

<video src="doc/example.webm" width="100%" controls></video>

## Core Requirements

### 1. Sequential Job Execution

- Design a system that executes asynchronous jobs one after another, not concurrently
- Each job should only begin after the previous job has completed
- Jobs may take varying amounts of time to complete
- The system should return results from each job via promises

### 2. Job Cancellation Mechanism

- Implement functionality to cancel jobs that haven't started execution yet
- Cancellation of one job should not affect the execution of other jobs
- The system should handle cancellation gracefully without breaking the job chain

### 3. Status Tracking (Optional)

- Track the status of each job (pending, completed, or canceled)
- Provide a way to query a job's current status

## Functional Requirements

- Add Jobs: Allow adding new jobs to the queue at any time
- Job Execution Control: Execute jobs in the exact order they were added
- Job Results: Each job should return a result that callers can access
- Cancel Jobs: Support cancellation of specific jobs before they begin execution
- Error Handling: Properly handle and propagate errors from failed jobs
- Query Job Status: Allow querying the status of a job (optional)

## Testing Requirements

- Create a test script that demonstrates:
  - Adding multiple jobs with different execution times
  - Showing that jobs execute in sequence regardless of their duration
  - Cancelling specific jobs and verifying they don't execute
  - Confirming that the job queue continues processing after cancellations
  - Querying the status of jobs (optional)

## Constraints

- Complete the challenge within 1 hour
- No external libraries for promise management (only vanilla JS/TS)
- Focus on functionality rather than UI implementation
