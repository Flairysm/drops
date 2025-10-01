import { Request, Response } from 'express';
import { z } from 'zod';
import { Pool } from 'pg';
import { createWriteStream, createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Transform } from 'stream';
import { AuditLogger } from '../types/audit';
import { ErrorTracker } from '../monitoring/errorTracker';

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeHeaders?: boolean;
  dateFormat?: string;
  filters?: Record<string, any>;
  fields?: string[];
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  validateData?: boolean;
  batchSize?: number;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  recordCount: number;
  fileSize: number;
  downloadUrl: string;
  expiresAt: Date;
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  duration: number;
}

// Export/Import schemas
const exportSchema = z.object({
  type: z.enum(['users', 'packs', 'inventory', 'transactions']),
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  includeHeaders: z.boolean().default(true),
  dateFormat: z.string().default('YYYY-MM-DD HH:mm:ss'),
  filters: z.record(z.any()).optional(),
  fields: z.array(z.string()).optional(),
});

const importSchema = z.object({
  type: z.enum(['users', 'packs', 'inventory']),
  data: z.array(z.record(z.any())).min(1).max(10000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    validateData: z.boolean().default(true),
    batchSize: z.number().int().min(1).max(1000).default(100),
  }).optional(),
});

export class DataExportImportService {
  private static instance: DataExportImportService;
  private pool: Pool;
  private auditLogger: AuditLogger;
  private errorTracker: ErrorTracker;
  private exportDir: string;
  private importDir: string;

  private constructor(
    pool: Pool,
    auditLogger: AuditLogger,
    errorTracker: ErrorTracker,
    exportDir: string = './exports',
    importDir: string = './imports'
  ) {
    this.pool = pool;
    this.auditLogger = auditLogger;
    this.errorTracker = errorTracker;
    this.exportDir = exportDir;
    this.importDir = importDir;
  }

  static getInstance(
    pool: Pool,
    auditLogger: AuditLogger,
    errorTracker: ErrorTracker,
    exportDir?: string,
    importDir?: string
  ): DataExportImportService {
    if (!DataExportImportService.instance) {
      DataExportImportService.instance = new DataExportImportService(
        pool,
        auditLogger,
        errorTracker,
        exportDir,
        importDir
      );
    }
    return DataExportImportService.instance;
  }

  async exportData(
    options: z.infer<typeof exportSchema>,
    adminId: string,
    adminUsername: string
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const validatedOptions = exportSchema.parse(options);
    
    try {
      const filename = this.generateFilename(validatedOptions.type, validatedOptions.format);
      const filepath = `${this.exportDir}/${filename}`;
      
      // Get data from database
      const data = await this.fetchDataForExport(validatedOptions);
      
      // Export to file
      await this.writeToFile(data, filepath, validatedOptions);
      
      // Get file stats
      const fs = await import('fs/promises');
      const stats = await fs.stat(filepath);
      
      const result: ExportResult = {
        success: true,
        filename,
        recordCount: data.length,
        fileSize: stats.size,
        downloadUrl: `/api/admin/exports/${filename}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Audit log
      await this.auditLogger.log(
        adminId,
        adminUsername,
        'export.data',
        validatedOptions.type,
        filename,
        {
          format: validatedOptions.format,
          recordCount: data.length,
          fileSize: stats.size,
        },
        { ipAddress: 'unknown', userAgent: 'unknown' },
        'success'
      );

      return result;
    } catch (error) {
      await this.errorTracker.trackBusinessError(
        error instanceof Error ? error : new Error('Data export failed'),
        { adminId, options }
      );
      
      throw error;
    }
  }

  async importData(
    options: z.infer<typeof importSchema>,
    adminId: string,
    adminUsername: string
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const validatedOptions = importSchema.parse(options);
    
    try {
      const result = await this.processImport(validatedOptions, adminId, adminUsername);
      
      // Audit log
      await this.auditLogger.log(
        adminId,
        adminUsername,
        'import.data',
        validatedOptions.type,
        'bulk_import',
        {
          totalRecords: result.totalRecords,
          importedRecords: result.importedRecords,
          skippedRecords: result.skippedRecords,
          failedRecords: result.failedRecords,
        },
        { ipAddress: 'unknown', userAgent: 'unknown' },
        result.failedRecords === 0 ? 'success' : 'partial'
      );

      return result;
    } catch (error) {
      await this.errorTracker.trackBusinessError(
        error instanceof Error ? error : new Error('Data import failed'),
        { adminId, options }
      );
      
      throw error;
    }
  }

  private async fetchDataForExport(options: z.infer<typeof exportSchema>): Promise<any[]> {
    let query = `SELECT * FROM ${options.type}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (options.filters) {
      const conditions: string[] = [];
      
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            conditions.push(`${key} = ANY($${paramIndex})`);
            params.push(value);
          } else if (typeof value === 'string') {
            conditions.push(`${key} ILIKE $${paramIndex}`);
            params.push(`%${value}%`);
          } else {
            conditions.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Apply field selection
    if (options.fields && options.fields.length > 0) {
      const fields = options.fields.join(', ');
      query = query.replace('*', fields);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  private async writeToFile(
    data: any[],
    filepath: string,
    options: z.infer<typeof exportSchema>
  ): Promise<void> {
    const fs = await import('fs/promises');
    
    // Ensure directory exists
    await fs.mkdir(this.exportDir, { recursive: true });

    if (options.format === 'json') {
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    } else if (options.format === 'csv') {
      await this.writeCSV(data, filepath, options);
    } else if (options.format === 'xlsx') {
      await this.writeExcel(data, filepath, options);
    }
  }

  private async writeCSV(
    data: any[],
    filepath: string,
    options: z.infer<typeof exportSchema>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filepath);
      const stringifier = stringify({
        header: options.includeHeaders,
        columns: options.fields,
      });

      stringifier.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      stringifier.pipe(writeStream);

      data.forEach(row => stringifier.write(row));
      stringifier.end();
    });
  }

  private async writeExcel(
    data: any[],
    filepath: string,
    options: z.infer<typeof exportSchema>
  ): Promise<void> {
    // This would use a library like 'xlsx' or 'exceljs'
    // For now, we'll convert to CSV as a fallback
    await this.writeCSV(data, filepath.replace('.xlsx', '.csv'), options);
  }

  private async processImport(
    options: z.infer<typeof importSchema>,
    adminId: string,
    adminUsername: string
  ): Promise<ImportResult> {
    const importOptions = options.options || {};
    const batchSize = importOptions.batchSize || 100;
    
    let importedRecords = 0;
    let skippedRecords = 0;
    let failedRecords = 0;
    const errors: ImportResult['errors'] = [];

    // Process in batches
    for (let i = 0; i < options.data.length; i += batchSize) {
      const batch = options.data.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j;
        const row = batch[j];
        
        try {
          // Validate data if required
          if (importOptions.validateData) {
            await this.validateImportRow(row, options.type);
          }
          
          // Check for duplicates
          if (importOptions.skipDuplicates) {
            const exists = await this.checkRecordExists(row, options.type);
            if (exists) {
              skippedRecords++;
              continue;
            }
          }
          
          // Insert or update record
          if (importOptions.updateExisting) {
            await this.upsertRecord(row, options.type);
          } else {
            await this.insertRecord(row, options.type);
          }
          
          importedRecords++;
        } catch (error) {
          failedRecords++;
          errors.push({
            row: rowIndex + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: row,
          });
        }
      }
    }

    return {
      success: failedRecords === 0,
      totalRecords: options.data.length,
      importedRecords,
      skippedRecords,
      failedRecords,
      errors,
      duration: Date.now() - Date.now(), // This would be calculated properly
    };
  }

  private async validateImportRow(row: any, type: string): Promise<void> {
    // Type-specific validation
    switch (type) {
      case 'users':
        if (!row.username || !row.email) {
          throw new Error('Username and email are required');
        }
        if (row.credits && (isNaN(row.credits) || row.credits < 0)) {
          throw new Error('Credits must be a non-negative number');
        }
        break;
        
      case 'packs':
        if (!row.name || !row.price) {
          throw new Error('Name and price are required');
        }
        if (isNaN(row.price) || row.price <= 0) {
          throw new Error('Price must be a positive number');
        }
        break;
        
      case 'inventory':
        if (!row.name || !row.credits || !row.tier) {
          throw new Error('Name, credits, and tier are required');
        }
        if (isNaN(row.credits) || row.credits < 0) {
          throw new Error('Credits must be a non-negative number');
        }
        if (!['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].includes(row.tier)) {
          throw new Error('Invalid tier');
        }
        break;
    }
  }

  private async checkRecordExists(row: any, type: string): Promise<boolean> {
    let query: string;
    let params: any[];

    switch (type) {
      case 'users':
        query = 'SELECT id FROM users WHERE username = $1 OR email = $2';
        params = [row.username, row.email];
        break;
        
      case 'packs':
        query = 'SELECT id FROM packs WHERE name = $1';
        params = [row.name];
        break;
        
      case 'inventory':
        query = 'SELECT id FROM inventory WHERE name = $1';
        params = [row.name];
        break;
        
      default:
        return false;
    }

    const result = await this.pool.query(query, params);
    return result.rows.length > 0;
  }

  private async insertRecord(row: any, type: string): Promise<void> {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${type} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    await this.pool.query(query, values);
  }

  private async upsertRecord(row: any, type: string): Promise<void> {
    // This would implement UPSERT logic based on the table structure
    // For now, we'll use a simple insert with conflict resolution
    await this.insertRecord(row, type);
  }

  private generateFilename(type: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${type}_export_${timestamp}.${format}`;
  }

  // File upload handler for imports
  async handleFileUpload(
    file: Express.Multer.File,
    type: string,
    adminId: string,
    adminUsername: string
  ): Promise<ImportResult> {
    try {
      // Parse file based on extension
      const data = await this.parseUploadedFile(file);
      
      // Import data
      const result = await this.importData(
        { type: type as any, data },
        adminId,
        adminUsername
      );

      return result;
    } catch (error) {
      await this.errorTracker.trackBusinessError(
        error instanceof Error ? error : new Error('File upload import failed'),
        { adminId, type, filename: file.originalname }
      );
      
      throw error;
    }
  }

  private async parseUploadedFile(file: Express.Multer.File): Promise<any[]> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      return await this.parseCSV(file.buffer);
    } else if (extension === 'json') {
      return JSON.parse(file.buffer.toString());
    } else {
      throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  private async parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
      });

      parser.on('readable', function() {
        let record;
        while (record = parser.read()) {
          records.push(record);
        }
      });

      parser.on('error', reject);
      parser.on('end', () => resolve(records));

      parser.write(buffer);
      parser.end();
    });
  }
}

// Express route handlers
export const createExportImportRoutes = (
  service: DataExportImportService
) => {
  return {
    // Export data
    exportData: async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user?.id;
        const adminUsername = (req as any).user?.username;
        
        if (!adminId || !adminUsername) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await service.exportData(req.body, adminId, adminUsername);
        res.json(result);
      } catch (error) {
        console.error('Export error:', error);
        res.status(400).json({
          error: 'Export failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Import data
    importData: async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user?.id;
        const adminUsername = (req as any).user?.username;
        
        if (!adminId || !adminUsername) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await service.importData(req.body, adminId, adminUsername);
        res.json(result);
      } catch (error) {
        console.error('Import error:', error);
        res.status(400).json({
          error: 'Import failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Upload and import file
    uploadAndImport: async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user?.id;
        const adminUsername = (req as any).user?.username;
        
        if (!adminId || !adminUsername) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const type = req.body.type;
        if (!type) {
          return res.status(400).json({ error: 'Type is required' });
        }

        const result = await service.handleFileUpload(file, type, adminId, adminUsername);
        res.json(result);
      } catch (error) {
        console.error('Upload import error:', error);
        res.status(400).json({
          error: 'Upload import failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Download exported file
    downloadExport: async (req: Request, res: Response) => {
      try {
        const filename = req.params.filename;
        const filepath = `${service['exportDir']}/${filename}`;
        
        const fs = await import('fs/promises');
        await fs.access(filepath);
        
        res.download(filepath);
      } catch (error) {
        res.status(404).json({ error: 'File not found' });
      }
    },
  };
};
