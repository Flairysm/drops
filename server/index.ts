import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { WebSocketServer } from 'ws';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Fixed import.meta.dirname issue for production builds
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// IMPORTANT: Session middleware must be set up BEFORE CORS
// This will be done in registerRoutes via setupAuth()

// Security middleware
app.use((req, res, next) => {
  // Security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });
  
  // Remove any existing cache headers
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
  
  // Set aggressive cache-busting headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  
  // Add random timestamp to prevent any caching
  res.set('X-Cache-Buster', Date.now().toString());
  
  next();
});

// Configure CORS based on environment
// NOTE: CORS must come AFTER session middleware (which is set up in registerRoutes)
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

app.use(cors({
  origin: function (origin, callback) {
    // In production, be strict about origins
    if (isProduction) {
      if (!origin) return callback(new Error('No origin provided'), false);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'), false);
    }
    
    // In development, allow localhost and no origin
    if (!origin) return callback(null, true);
    
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0')) {
      return callback(null, true);
    }
    
    // For development, allow any origin
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Disable caching for all API routes - MORE AGGRESSIVE
app.use('/api', (req, res, next) => {
  // Remove any existing cache headers
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
  
  // Set aggressive cache-busting headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  
  // Add random timestamp to prevent any caching
  res.set('X-Cache-Buster', Date.now().toString());
  
  next();
});

// EXTRA AGGRESSIVE cache bypass for admin routes
app.use('/api/admin', (req, res, next) => {
  // Remove any existing cache headers
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
  
  // Set ULTRA aggressive cache-busting headers for admin
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    'X-Admin-Cache-Bypass': 'true'
  });
  
  // Add random timestamp to prevent any caching
  res.set('X-Cache-Buster', Date.now().toString());
  res.set('X-Admin-Timestamp', Date.now().toString());
  
  next();
});

// Serve attached assets as static files
app.use('/attached_assets', express.static(path.resolve(__dirname, '../attached_assets')));

// Debug middleware to log all requests and CORS headers
app.use((req, res, next) => {
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    
    const server = await registerRoutes(app);


    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('❌ Server error:', err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = '0.0.0.0'; // Bind to all interfaces for better compatibility
    
    // Setup WebSocket server
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws) => {
      console.log('🔌 WebSocket client connected');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📡 WebSocket message received:', data);
          
          // Echo back or handle specific message types
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
      });
      
      ws.on('error', (error) => {
        console.error('🔌 WebSocket error:', error);
      });
    });

    server.listen(port, host, () => {
      log(`serving on port ${port} (${host})`);
      log(`WebSocket server running on ws://${host}:${port}/ws`);
    });
    
    server.on('error', (err) => {
      console.error('❌ Server failed to start:', err);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
