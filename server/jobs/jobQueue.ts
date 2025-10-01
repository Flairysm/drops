import { EventEmitter } from 'events';

export interface Job {
  id: string;
  type: string;
  data: any;
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

export interface JobOptions {
  priority?: number;
  delay?: number; // Delay in milliseconds
  maxAttempts?: number;
  timeout?: number; // Timeout in milliseconds
  metadata?: Record<string, any>;
}

export interface JobProcessor {
  type: string;
  processor: (job: Job) => Promise<any>;
  concurrency?: number;
}

export class JobQueue extends EventEmitter {
  private static instance: JobQueue;
  private jobs: Map<string, Job> = new Map();
  private pendingJobs: Job[] = [];
  private runningJobs: Map<string, Job> = new Map();
  private processors: Map<string, JobProcessor> = new Map();
  private workers: Map<string, Worker> = new Map();
  private isProcessing: boolean = false;
  private maxConcurrency: number = 5;

  private constructor() {
    super();
  }

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  registerProcessor(processor: JobProcessor): void {
    this.processors.set(processor.type, processor);
    this.emit('processorRegistered', processor);
  }

  async addJob(type: string, data: any, options: JobOptions = {}): Promise<string> {
    const job: Job = {
      id: this.generateJobId(),
      type,
      data,
      priority: options.priority || 0,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      metadata: options.metadata,
    };

    this.jobs.set(job.id, job);

    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        this.pendingJobs.push(job);
        this.sortPendingJobs();
        this.processJobs();
      }, options.delay);
    } else {
      this.pendingJobs.push(job);
      this.sortPendingJobs();
      this.processJobs();
    }

    this.emit('jobAdded', job);
    return job.id;
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) || null;
  }

  async getJobs(status?: Job['status'], limit: number = 100): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values());
    
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }

    return jobs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'pending') {
      job.status = 'cancelled';
      this.pendingJobs = this.pendingJobs.filter(j => j.id !== jobId);
      this.emit('jobCancelled', job);
      return true;
    }

    if (job.status === 'running') {
      // Mark for cancellation - the worker will check this
      job.status = 'cancelled';
      this.emit('jobCancelled', job);
      return true;
    }

    return false;
  }

  async retryJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'pending';
    job.attempts = 0;
    job.error = undefined;
    this.pendingJobs.push(job);
    this.sortPendingJobs();
    this.processJobs();

    this.emit('jobRetried', job);
    return true;
  }

  private async processJobs(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.pendingJobs.length > 0 && this.runningJobs.size < this.maxConcurrency) {
        const job = this.pendingJobs.shift();
        if (!job) break;

        const processor = this.processors.get(job.type);
        if (!processor) {
          job.status = 'failed';
          job.error = `No processor found for job type: ${job.type}`;
          this.emit('jobFailed', job);
          continue;
        }

        await this.executeJob(job, processor);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeJob(job: Job, processor: JobProcessor): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();
    job.attempts++;
    this.runningJobs.set(job.id, job);

    this.emit('jobStarted', job);

    try {
      const timeout = job.metadata?.timeout || 30000; // 30 seconds default
      const result = await this.withTimeout(
        processor.processor(job),
        timeout
      );

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      this.emit('jobCompleted', job);
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.attempts < job.maxAttempts) {
        job.status = 'pending';
        this.pendingJobs.push(job);
        this.sortPendingJobs();
        this.emit('jobRetrying', job);
      } else {
        job.status = 'failed';
        this.emit('jobFailed', job);
      }
    } finally {
      this.runningJobs.delete(job.id);
      this.processJobs(); // Process next job
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), timeoutMs);
      }),
    ]);
  }

  private sortPendingJobs(): void {
    this.pendingJobs.sort((a, b) => {
      // Higher priority first, then older jobs first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Job statistics
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
    };
  }

  // Cleanup old jobs
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAge);
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoff && (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.emit('jobsCleaned', { count: cleanedCount });
    }

    return cleanedCount;
  }
}

// Predefined job types
export class JobTypes {
  static readonly EXPORT_DATA = 'export_data';
  static readonly IMPORT_DATA = 'import_data';
  static readonly SEND_EMAIL = 'send_email';
  static readonly GENERATE_REPORT = 'generate_report';
  static readonly BACKUP_DATABASE = 'backup_database';
  static readonly CLEANUP_LOGS = 'cleanup_logs';
  static readonly PROCESS_IMAGES = 'process_images';
  static readonly SYNC_EXTERNAL_DATA = 'sync_external_data';
}

// Job factory functions
export class JobFactory {
  static createExportJob(dataType: string, filters: any, adminId: string): { type: string; data: any } {
    return {
      type: JobTypes.EXPORT_DATA,
      data: { dataType, filters, adminId },
    };
  }

  static createImportJob(dataType: string, data: any[], adminId: string): { type: string; data: any } {
    return {
      type: JobTypes.IMPORT_DATA,
      data: { dataType, data, adminId },
    };
  }

  static createEmailJob(to: string, subject: string, body: string, adminId: string): { type: string; data: any } {
    return {
      type: JobTypes.SEND_EMAIL,
      data: { to, subject, body, adminId },
    };
  }

  static createReportJob(reportType: string, parameters: any, adminId: string): { type: string; data: any } {
    return {
      type: JobTypes.GENERATE_REPORT,
      data: { reportType, parameters, adminId },
    };
  }

  static createBackupJob(backupType: string, adminId: string): { type: string; data: any } {
    return {
      type: JobTypes.BACKUP_DATABASE,
      data: { backupType, adminId },
    };
  }
}
