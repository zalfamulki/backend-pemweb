const express = require('express');
const cors = require('cors');
const app = express();

// Trust reverse proxy (Railway, Vercel, Nginx, etc.)
app.set('trust proxy', 1);

// Robust CORS Middleware supporting Vercel (production & preview branches), Postman, localhost, and mobile apps
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any origin (Vercel, localhost, etc.)
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',    require('./routes/auth.routes'));
app.use('/api/users',   require('./routes/user.routes'));
app.use('/api/news',    require('./routes/news.routes'));
app.use('/api/rooms',   require('./routes/room.routes'));
app.use('/api/scores',  require('./routes/score.routes'));
app.use('/api/admin',   require('./routes/admin.routes'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', game: 'Truth or Trap' }));

// 404 fallback
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

module.exports = app;
