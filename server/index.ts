import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from 'url';
// import { getAdminEnhancements } from "./integration/adminEnhancements";

// Fixed import.meta.dirname issue for production builds
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// IMPORTANT: Session middleware must be set up BEFORE CORS
// This will be done in registerRoutes via setupAuth()

// Disable caching globally for the entire app - NUCLEAR OPTION
app.use((req, res, next) => {
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

// Configure CORS to allow requests from all origins for development
// NOTE: CORS must come AFTER session middleware (which is set up in registerRoutes)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost variations
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0')) {
      return callback(null, true);
    }
    
    // Allow specific production domains
    const allowedOrigins = [
      'https://dropss.vercel.app',
      'https://dropss-cpqc83t8f-bryants-projects-322ba146.vercel.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow any origin
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
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
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
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
    console.log('🚀 Starting server...');
    
    const server = await registerRoutes(app);
    console.log('✅ Routes registered successfully');

    // Initialize admin enhancements
    // console.log('🔧 Initializing admin enhancements...');
    // const adminEnhancements = getAdminEnhancements(app);
    // await adminEnhancements.initialize();
    // console.log('✅ Admin enhancements initialized');

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
      console.log('🔧 Setting up Vite for development');
      await setupVite(app, server);
    } else {
      console.log('🚀 Setting up static file serving for production');
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = '0.0.0.0'; // Bind to all interfaces for better compatibility
    
    server.listen(port, host, () => {
      console.log(`🎉 Server running on port ${port} (${host})`);
      log(`serving on port ${port} (${host})`);
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
