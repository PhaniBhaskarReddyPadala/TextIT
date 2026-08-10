'use strict';
const path = require('path');
const { PORT, CLIENT_URL, NODE_ENV } = require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const textRoutes = require('./routes/textRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server or non-browser requests
    if (!origin) return callback(null, true);
    
    // Check if origin matches CLIENT_URL, localhost, or vercel.app
    if (
      CLIENT_URL === '*' ||
      origin === CLIENT_URL ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    
    return callback(null, true); // Permissive fallback for deployment flexibility
  },
  credentials: true, // Required for cookie passing
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

// ─── General Rate Limiter ────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spaceRoutes);
// Text routes nested under spaces: /api/spaces/:spaceId/text
app.use('/api/spaces/:spaceId/text', textRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

// ─── Static Frontend Serving (Production) ────────────────────────────────────
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// 404 for unknown API routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ─── Error Middleware (must be last) ─────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start Server ─────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`TextIt server running on port ${PORT} [${NODE_ENV}]`);
  });
};

start();

