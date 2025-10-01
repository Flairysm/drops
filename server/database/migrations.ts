import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  executedAt?: Date;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  error?: string;
  duration: number;
}

export class MigrationManager {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool, migrationsPath: string = './migrations') {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await this.pool.query(`
      SELECT id, name, checksum, executed_at as executedAt
      FROM migrations
      ORDER BY executed_at ASC
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      up: '', // Not needed for executed migrations
      down: '', // Not needed for executed migrations
      executedAt: row.executedat,
      checksum: row.checksum,
    }));
  }

  async loadMigrations(): Promise<Migration[]> {
    try {
      const migrationFiles = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const migrations: Migration[] = [];

      for (const file of migrationFiles) {
        const filePath = join(this.migrationsPath, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Parse migration file (assumes format: -- UP: ... -- DOWN: ...)
        const upMatch = content.match(/--\s*UP:\s*([\s\S]*?)(?=--\s*DOWN:|$)/i);
        const downMatch = content.match(/--\s*DOWN:\s*([\s\S]*?)$/i);

        if (!upMatch || !downMatch) {
          throw new Error(`Invalid migration file format: ${file}`);
        }

        const id = file.replace('.sql', '');
        const up = upMatch[1].trim();
        const down = downMatch[1].trim();
        const checksum = this.calculateChecksum(content);

        migrations.push({
          id,
          name: file,
          up,
          down,
          checksum,
        });
      }

      return migrations;
    } catch (error) {
      console.error('Error loading migrations:', error);
      return [];
    }
  }

  async runMigrations(): Promise<MigrationResult[]> {
    await this.initialize();
    
    const executedMigrations = await this.getExecutedMigrations();
    const availableMigrations = await this.loadMigrations();
    
    const pendingMigrations = availableMigrations.filter(
      migration => !executedMigrations.some(executed => executed.id === migration.id)
    );

    const results: MigrationResult[] = [];

    for (const migration of pendingMigrations) {
      const startTime = Date.now();
      
      try {
        console.log(`🔄 Running migration: ${migration.name}`);
        
        // Execute migration
        await this.pool.query(migration.up);
        
        // Record migration as executed
        await this.pool.query(`
          INSERT INTO migrations (id, name, checksum)
          VALUES ($1, $2, $3)
        `, [migration.id, migration.name, migration.checksum]);

        const duration = Date.now() - startTime;
        console.log(`✅ Migration completed: ${migration.name} (${duration}ms)`);
        
        results.push({
          success: true,
          migrationId: migration.id,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`❌ Migration failed: ${migration.name}`, error);
        
        results.push({
          success: false,
          migrationId: migration.id,
          error: errorMessage,
          duration,
        });
        
        // Stop on first failure
        break;
      }
    }

    return results;
  }

  async rollbackMigration(migrationId: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const migration = executedMigrations.find(m => m.id === migrationId);
      
      if (!migration) {
        throw new Error(`Migration ${migrationId} not found in executed migrations`);
      }

      const availableMigrations = await this.loadMigrations();
      const migrationData = availableMigrations.find(m => m.id === migrationId);
      
      if (!migrationData) {
        throw new Error(`Migration ${migrationId} not found in available migrations`);
      }

      console.log(`🔄 Rolling back migration: ${migration.name}`);
      
      // Execute rollback
      await this.pool.query(migrationData.down);
      
      // Remove from executed migrations
      await this.pool.query(`
        DELETE FROM migrations WHERE id = $1
      `, [migrationId]);

      const duration = Date.now() - startTime;
      console.log(`✅ Rollback completed: ${migration.name} (${duration}ms)`);
      
      return {
        success: true,
        migrationId,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Rollback failed: ${migrationId}`, error);
      
      return {
        success: false,
        migrationId,
        error: errorMessage,
        duration,
      };
    }
  }

  async getMigrationStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    lastExecuted?: Date;
  }> {
    const executedMigrations = await this.getExecutedMigrations();
    const availableMigrations = await this.loadMigrations();
    
    return {
      total: availableMigrations.length,
      executed: executedMigrations.length,
      pending: availableMigrations.length - executedMigrations.length,
      lastExecuted: executedMigrations.length > 0 
        ? executedMigrations[executedMigrations.length - 1].executedAt 
        : undefined,
    };
  }

  private calculateChecksum(content: string): string {
    // Simple checksum calculation (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async validateMigrations(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const availableMigrations = await this.loadMigrations();
      
      // Check for missing migrations
      for (const executed of executedMigrations) {
        const available = availableMigrations.find(m => m.id === executed.id);
        if (!available) {
          errors.push(`Executed migration ${executed.id} not found in available migrations`);
        } else if (available.checksum !== executed.checksum) {
          errors.push(`Checksum mismatch for migration ${executed.id}`);
        }
      }
      
      // Check for duplicate migration IDs
      const ids = availableMigrations.map(m => m.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate migration IDs found: ${duplicates.join(', ')}`);
      }
      
    } catch (error) {
      errors.push(`Error validating migrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Migration templates
export const createMigrationTemplate = (name: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const id = `${timestamp}_${name}`;
  
  return `-- Migration: ${name}
-- ID: ${id}
-- Created: ${new Date().toISOString()}

-- UP: Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- DOWN: Add your rollback SQL here
-- Example:
-- DROP TABLE IF EXISTS example_table;
`;
};

// Auto-migration runner
export class AutoMigrationRunner {
  private migrationManager: MigrationManager;
  private isRunning: boolean = false;

  constructor(pool: Pool, migrationsPath?: string) {
    this.migrationManager = new MigrationManager(pool, migrationsPath);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Migration runner is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting auto-migration runner...');

    try {
      const results = await this.migrationManager.runMigrations();
      
      if (results.length === 0) {
        console.log('✅ No pending migrations');
      } else {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`📊 Migration results: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
          console.error('❌ Some migrations failed. Check the logs for details.');
        }
      }
    } catch (error) {
      console.error('❌ Auto-migration failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    status: any;
  }> {
    const status = await this.migrationManager.getMigrationStatus();
    return {
      isRunning: this.isRunning,
      status,
    };
  }
}
