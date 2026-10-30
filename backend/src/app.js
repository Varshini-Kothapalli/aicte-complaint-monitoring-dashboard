const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Security and CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      const allowedOrigins = (config.corsOrigin || '')
        .split(',')
        .map((o) => o.trim().replace(/\/+$/, ''))
        .filter(Boolean);
      if (allowedOrigins.includes('*')) return callback(null, true);
      if (allowedOrigins.includes(cleanOrigin)) return callback(null, true);
      if (config.nodeEnv !== 'production' || allowedOrigins.some((o) => o.includes('localhost') || o.includes('127.0.0.1'))) {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return callback(null, true);
      }
      if (allowedOrigins.some((o) => o.includes('.vercel.app')) && /^https:\/\/[a-zA-Z0-9-_.]+\.vercel\.app$/.test(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Top-level health check endpoint for hosting platform monitors
app.use('/health', require('./routes/health.routes'));

// Mount REST API routes
app.use(config.apiPrefix, apiRoutes);

// Root path handler
app.get('/', (req, res) => {
  res.json({
    project: 'AICTE Integrated Institution Complaint Monitoring and Status Dashboard',
    status: 'online',
    healthCheck: `${config.apiPrefix}/health`,
  });
});

// 404 handler
app.use(notFound);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
