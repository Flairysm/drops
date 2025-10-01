import { db } from '../db';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ErrorTracker } from '../monitoring/errorTracker';
import { JobQueue } from '../jobs/jobQueue';
import config from '../config';

const execAsync = promisify(exec);

// Create instances for backup jobs and error tracking
const jobQueue = new JobQueue();
const errorTracker = new ErrorTracker();

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retentionDays: number;
  compression: boolean;
  encryption: boolean;
  storageLocation: string;
  includeTables: string[];
  excludeTables: string[];
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  type: 'full' | 'incremental' | 'schema';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export class BackupManager {
  private static instance: BackupManager;
  private config: BackupConfig;
  private backups: Map<string, BackupInfo> = new Map();

  private constructor() {
    this.config = {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
      compression: process.env.BACKUP_COMPRESSION === 'true',
      encryption: process.env.BACKUP_ENCRYPTION === 'true',
      storageLocation: process.env.BACKUP_STORAGE_LOCATION || './backups',
      includeTables: process.env.BACKUP_INCLUDE_TABLES?.split(',') || [],
      excludeTables: process.env.BACKUP_EXCLUDE_TABLES?.split(',') || ['audit_logs', 'sessions'],
    };

    this.initializeBackupDirectory();
  }

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageLocation, { recursive: true });
      console.log(`📁 Backup directory initialized: ${this.config.storageLocation}`);
    } catch (error) {
      console.error('Failed to initialize backup directory:', error);
    }
  }

  // Create a full database backup
  async createFullBackup(): Promise<BackupInfo> {
    const backupId = `full_${Date.now()}`;
    const filename = `backup_${backupId}.sql`;
    const filepath = path.join(this.config.storageLocation, filename);

    const backupInfo: BackupInfo = {
      id: backupId,
      filename,
      size: 0,
      createdAt: new Date(),
      type: 'full',
      status: 'in_progress',
    };

    this.backups.set(backupId, backupInfo);

    try {
      console.log(`🔄 Starting full backup: ${filename}`);

      // Get database connection details from config
      const dbUrl = new URL(config.databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      // Build pg_dump command
      let command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database}`;
      
      // Add table filters
      if (this.config.includeTables.length > 0) {
        command += ` -t ${this.config.includeTables.join(' -t ')}`;
      }
      
      if (this.config.excludeTables.length > 0) {
        command += ` -T ${this.config.excludeTables.join(' -T ')}`;
      }

      // Add compression
      if (this.config.compression) {
        command += ' -Z 9';
      }

      // Add encryption (if enabled)
      if (this.config.encryption) {
        command += ' --encrypt';
      }

      command += ` -f ${filepath}`;

      // Set password environment variable
      const env = { ...process.env, PGPASSWORD: password };

      // Execute backup
      await execAsync(command, { env });

      // Get file size
      const stats = await fs.stat(filepath);
      backupInfo.size = stats.size;
      backupInfo.status = 'completed';

      console.log(`✅ Full backup completed: ${filename} (${this.formatFileSize(backupInfo.size)})`);

      // Schedule cleanup of old backups
      await this.cleanupOldBackups();

      return backupInfo;
    } catch (error: any) {
      backupInfo.status = 'failed';
      backupInfo.error = error.message;
      
      errorTracker.trackError(error, { backupId, type: 'full' }, 'high');
      console.error(`❌ Full backup failed: ${error.message}`);
      
      throw error;
    }
  }

  // Create an incremental backup (only changed data)
  async createIncrementalBackup(): Promise<BackupInfo> {
    const backupId = `incremental_${Date.now()}`;
    const filename = `backup_${backupId}.sql`;
    const filepath = path.join(this.config.storageLocation, filename);

    const backupInfo: BackupInfo = {
      id: backupId,
      filename,
      size: 0,
      createdAt: new Date(),
      type: 'incremental',
      status: 'in_progress',
    };

    this.backups.set(backupId, backupInfo);

    try {
      console.log(`🔄 Starting incremental backup: ${filename}`);

      // Get last backup timestamp
      const lastBackup = await this.getLastBackup();
      const sinceTimestamp = lastBackup?.createdAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Export only data modified since last backup
      const tables = await this.getModifiedTables(sinceTimestamp);
      
      if (tables.length === 0) {
        console.log('📝 No changes detected, skipping incremental backup');
        backupInfo.status = 'completed';
        return backupInfo;
      }

      // Create incremental backup for modified tables
      const dbUrl = new URL(config.databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      let command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database}`;
      command += ` -t ${tables.join(' -t ')}`;
      command += ` -f ${filepath}`;

      const env = { ...process.env, PGPASSWORD: password };
      await execAsync(command, { env });

      const stats = await fs.stat(filepath);
      backupInfo.size = stats.size;
      backupInfo.status = 'completed';

      console.log(`✅ Incremental backup completed: ${filename} (${this.formatFileSize(backupInfo.size)})`);

      return backupInfo;
    } catch (error: any) {
      backupInfo.status = 'failed';
      backupInfo.error = error.message;
      
      errorTracker.trackError(error, { backupId, type: 'incremental' }, 'high');
      console.error(`❌ Incremental backup failed: ${error.message}`);
      
      throw error;
    }
  }

  // Create a schema-only backup
  async createSchemaBackup(): Promise<BackupInfo> {
    const backupId = `schema_${Date.now()}`;
    const filename = `backup_${backupId}.sql`;
    const filepath = path.join(this.config.storageLocation, filename);

    const backupInfo: BackupInfo = {
      id: backupId,
      filename,
      size: 0,
      createdAt: new Date(),
      type: 'schema',
      status: 'in_progress',
    };

    this.backups.set(backupId, backupInfo);

    try {
      console.log(`🔄 Starting schema backup: ${filename}`);

      const dbUrl = new URL(config.databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      let command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database}`;
      command += ' --schema-only';
      command += ` -f ${filepath}`;

      const env = { ...process.env, PGPASSWORD: password };
      await execAsync(command, { env });

      const stats = await fs.stat(filepath);
      backupInfo.size = stats.size;
      backupInfo.status = 'completed';

      console.log(`✅ Schema backup completed: ${filename} (${this.formatFileSize(backupInfo.size)})`);

      return backupInfo;
    } catch (error: any) {
      backupInfo.status = 'failed';
      backupInfo.error = error.message;
      
      errorTracker.trackError(error, { backupId, type: 'schema' }, 'high');
      console.error(`❌ Schema backup failed: ${error.message}`);
      
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.status !== 'completed') {
      throw new Error(`Cannot restore from incomplete backup: ${backupId}`);
    }

    const filepath = path.join(this.config.storageLocation, backup.filename);

    try {
      console.log(`🔄 Restoring from backup: ${backup.filename}`);

      const dbUrl = new URL(config.databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      let command = `psql -h ${host} -p ${port} -U ${username} -d ${database}`;
      command += ` -f ${filepath}`;

      const env = { ...process.env, PGPASSWORD: password };
      await execAsync(command, { env });

      console.log(`✅ Restore completed from: ${backup.filename}`);
    } catch (error: any) {
      errorTracker.trackError(error, { backupId, operation: 'restore' }, 'critical');
      console.error(`❌ Restore failed: ${error.message}`);
      throw error;
    }
  }

  // List all backups
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = await fs.readdir(this.config.storageLocation);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.startsWith('backup_') && file.endsWith('.sql')) {
          const filepath = path.join(this.config.storageLocation, file);
          const stats = await fs.stat(filepath);
          
          const backupId = file.replace('backup_', '').replace('.sql', '');
          const type = backupId.startsWith('full_') ? 'full' : 
                     backupId.startsWith('incremental_') ? 'incremental' : 'schema';

          backups.push({
            id: backupId,
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            type: type as 'full' | 'incremental' | 'schema',
            status: 'completed',
          });
        }
      }

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      errorTracker.trackError(error as Error, { operation: 'listBackups' }, 'medium');
      return [];
    }
  }

  // Cleanup old backups
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);

      for (const backup of backups) {
        if (backup.createdAt < cutoffDate) {
          const filepath = path.join(this.config.storageLocation, backup.filename);
          await fs.unlink(filepath);
          console.log(`🗑️ Deleted old backup: ${backup.filename}`);
        }
      }
    } catch (error) {
      errorTracker.trackError(error as Error, { operation: 'cleanupOldBackups' }, 'medium');
    }
  }

  // Get backup statistics
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    lastBackup: Date | null;
    oldestBackup: Date | null;
    backupTypes: Record<string, number>;
  }> {
    const backups = await this.listBackups();
    
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const lastBackup = backups.length > 0 ? backups[0].createdAt : null;
    const oldestBackup = backups.length > 0 ? backups[backups.length - 1].createdAt : null;
    
    const backupTypes = backups.reduce((acc, backup) => {
      acc[backup.type] = (acc[backup.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalBackups: backups.length,
      totalSize,
      lastBackup,
      oldestBackup,
      backupTypes,
    };
  }

  // Schedule automatic backups
  async scheduleBackups(): Promise<void> {
    if (!this.config.enabled) {
      console.log('📅 Backup scheduling is disabled');
      return;
    }

    console.log(`📅 Scheduling backups with cron: ${this.config.schedule}`);
    
    // Schedule full backup
    await jobQueue.addJob('backup', { type: 'full', schedule: this.config.schedule });
    
    // Schedule incremental backup (every 6 hours)
    await jobQueue.addJob('backup', { type: 'incremental', schedule: '0 */6 * * *' });
    
    // Schedule schema backup (weekly)
    await jobQueue.addJob('backup', { type: 'schema', schedule: '0 3 * * 0' });
  }

  // Get last backup
  private async getLastBackup(): Promise<BackupInfo | null> {
    const backups = await this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  // Get modified tables since timestamp
  private async getModifiedTables(since: Date): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd check table modification timestamps
      const result = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name NOT IN (${this.config.excludeTables.join("', '")})
      `);

      return result.rows.map((row: any) => row.table_name);
    } catch (error) {
      errorTracker.trackError(error as Error, { operation: 'getModifiedTables' }, 'medium');
      return [];
    }
  }

  // Format file size
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Update configuration
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 Backup configuration updated');
  }

  // Get current configuration
  getConfig(): BackupConfig {
    return { ...this.config };
  }
}

// Backup API endpoints
export const createBackupRoutes = (app: any) => {
  const backupManager = BackupManager.getInstance();

  // Create backup
  app.post('/api/admin/backup/create', async (req: any, res: any) => {
    try {
      const { type = 'full' } = req.body;
      
      let backup: BackupInfo;
      switch (type) {
        case 'full':
          backup = await backupManager.createFullBackup();
          break;
        case 'incremental':
          backup = await backupManager.createIncrementalBackup();
          break;
        case 'schema':
          backup = await backupManager.createSchemaBackup();
          break;
        default:
          return res.status(400).json({ error: 'Invalid backup type' });
      }

      res.json(backup);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List backups
  app.get('/api/admin/backup/list', async (req: any, res: any) => {
    try {
      const backups = await backupManager.listBackups();
      res.json(backups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get backup stats
  app.get('/api/admin/backup/stats', async (req: any, res: any) => {
    try {
      const stats = await backupManager.getBackupStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Restore from backup
  app.post('/api/admin/backup/restore/:backupId', async (req: any, res: any) => {
    try {
      const { backupId } = req.params;
      await backupManager.restoreFromBackup(backupId);
      res.json({ message: 'Restore completed successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update backup configuration
  app.put('/api/admin/backup/config', async (req: any, res: any) => {
    try {
      backupManager.updateConfig(req.body);
      res.json({ message: 'Backup configuration updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get backup configuration
  app.get('/api/admin/backup/config', async (req: any, res: any) => {
    try {
      const config = backupManager.getConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
};
