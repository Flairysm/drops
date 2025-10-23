import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from 'url';

// Fixed import.meta.dirname issue for production builds
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://dropstcg.vercel.app', 'https://dropstcg-*.vercel.app'] 
    : true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    message: 'Server is running! Database connection will be tested separately.'
  });
});

// Register all API routes with error handling
try {
  await registerRoutes(app);
  console.log('✅ Routes registered successfully');
} catch (error) {
  console.error('❌ Failed to register routes:', error);
  // Add a simple test endpoint even if routes fail
  app.get('/api/test', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      message: 'Basic API is working',
      error: error.message 
    });
  });
  app.get('/api/*', (req: Request, res: Response) => {
    res.status(500).json({ 
      error: 'Server initialization failed',
      message: 'Routes could not be registered',
      details: error.message
    });
  });
}

// Note: Static file serving is handled by Vercel's static build
// This server only handles API routes

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Export for Vercel
export default app;
