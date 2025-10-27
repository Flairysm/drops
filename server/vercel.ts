import express from 'express';
import cors from 'cors';
import { setupAuth } from './auth.js';
import { registerRoutes } from './routes.js';
import { testDatabaseConnection } from './db.js';

const app = express();

app.use(express.json());

// CORS configuration
const allowedOrigins = [
  'https://dropstcg.vercel.app',
  'http://localhost:5173', // For local development
  'http://localhost:3000' // For local development
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: dbConnected ? 'connected' : 'disconnected',
      message: dbConnected ? 'Server is running with database!' : 'Server is running but database is disconnected',
      mode: 'production'
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: 'Server error during health check',
      error: error.message
    });
  }
});

// Setup authentication
setupAuth(app);

// Register all API routes
try {
  console.log('🔄 Registering API routes...');
  const server = await registerRoutes(app);
  console.log('✅ API routes registered successfully');
} catch (error: any) {
  console.error('❌ Failed to register API routes:', error.message);
  
  // Add fallback endpoints if routes fail
  app.get('/api/*', (req, res) => {
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'API routes failed to load. Please try again later.',
      timestamp: new Date().toISOString()
    });
  });
}

export default app;