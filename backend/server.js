const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDatabase = require('./config/db');
const seedInitialData = require('./utils/seed');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');
const settingsRoutes = require('./routes/settings');
const testimonialRoutes = require('./routes/testimonials');
const Appointment = require('./models/Appointment');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
if (process.env.CORS_ORIGIN) {
  const allowedOrigins = process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
  }));
}
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  return res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/testimonials', testimonialRoutes);

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
app.use((req, res) => res.status(404).sendFile(path.join(frontendPath, '404.html')));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ message: 'This origin is not allowed.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Some submitted information is invalid.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' });
  }
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace-with-')) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  await connectDatabase();
  await seedInitialData();
  await Appointment.init();
  app.listen(port, () => console.log(`Royal Cuts is running at http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start Royal Cuts:', error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
