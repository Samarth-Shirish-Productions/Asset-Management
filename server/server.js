require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');
const passport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const requestRoutes = require('./routes/requestRoutes');
const orgRoutes = require('./routes/orgRoutes');

// Initialize database
connectDB();

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows browser to load images from our server
}));

// CORS Configuration
app.use(cors({
  origin: process.env.EXPECTED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom lightweight cookie parser middleware
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      req.cookies[name] = decodeURIComponent(val);
    });
  }
  next();
});

// Initialize Passport
app.use(passport.initialize());

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/org', orgRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Enterprise Asset Management API' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
