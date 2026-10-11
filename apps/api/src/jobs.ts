/**
 * A minimal in-process job queue with the same contract a BullMQ worker would
 * have: enqueue an ID, a worker processes it, concurrency is capped, and jobs
 * left queued by a restart are picked up again on boot (the queue state lives
 * in MongoDB as ai.state = "queued", not in memory).
 *
 * Milestone 2 swaps this file for BullMQ on Redis. Nothing else changes.
 */
export class JobQueue {
  private readonly pending: string[] = [];
  private running = 0;
  private idleWaiters: (() => void)[] = [];

  constructor(
    private readonly worker: (id: string) => Promise<void>,
    private readonly concurrency = 2,
  ) {}

  enqueue(id: string): void {
    if (this.pending.includes(id)) return;
    this.pending.push(id);
    this.pump();
  }

  /** Resolves once every queued job has finished. Used by tests and shutdown. */
  idle(): Promise<void> {
    if (this.running === 0 && this.pending.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private pump(): void {
    while (this.running < this.concurrency) {
      const id = this.pending.shift();
      if (id === undefined) return;
      this.running++;
      this.worker(id)
        .catch((err: unknown) => console.error(`job ${id} failed`, err))
        .finally(() => {
          this.running--;
          this.pump();
          if (this.running === 0 && this.pending.length === 0) {
            this.idleWaiters.splice(0).forEach((r) => r());
          }
        });
    }
  }
}
