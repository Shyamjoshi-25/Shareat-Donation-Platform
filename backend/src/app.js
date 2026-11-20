import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import donationRoutes from './routes/donations.js';
import adminRoutes from './routes/admin.js';
import profileRoutes from './routes/profile.js';
import complaintRoutes from './routes/complaints.js';
import analyticsRoutes from './routes/analytics.js';
import trackingRoutes from './routes/tracking.js';
import courierWebhookRoutes from './routes/courierWebhook.js';
import noteRoutes from './routes/notes.js';
import notificationRoutes from './routes/notifications.js';
import ngoRoutes from './routes/ngos.js';
import beneficiaryRoutes from './routes/beneficiaries.js';
import categoryRoutes from './routes/categories.js';
import locationRoutes from './routes/locations.js';
import Category from './models/Category.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  ...(process.env.VERCEL_URL
    ? [`https://${process.env.VERCEL_URL}`]
    : [])
];

app.disable('x-powered-by');

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

let initializationPromise;

function initializeApplication() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (!/^[a-f0-9]{64}$/i.test(process.env.PII_ENCRYPTION_KEY || '')) {
        throw new Error('PII_ENCRYPTION_KEY must be a 64-character hexadecimal key.');
      }

      if (
        !process.env.JWT_SECRET ||
        process.env.JWT_SECRET.length < 32 ||
        process.env.JWT_SECRET.toLowerCase().includes('change_me')
      ) {
        throw new Error('JWT_SECRET must be a unique random value of at least 32 characters.');
      }

      await connectDB();

      const defaults = [
        'Clothes',
        'Footwear',
        'Food & groceries',
        'Books',
        'Stationery & school supplies',
        'Household items',
        'Blankets & bedding',
        'Toys',
        'Electronics',
        'Other'
      ];

      await Category.bulkWrite(
        defaults.map(name => ({
          updateOne: {
            filter: { name },
            update: {
              $setOnInsert: { name, itemTypes: [], active: true }
            },
            upsert: true
          }
        }))
      );
    })().catch(error => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

app.use(async (req, res, next) => {
  try {
    await initializeApplication();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Donation & Reuse API' });
});

app.use('/api/webhooks', courierWebhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

app.use((error, req, res, next) => {
  if (error?.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({
      message: 'This website is not allowed to access the API.'
    });
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' });
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Invalid JSON request body.' });
  }

  console.error('Unhandled API error:', error.message);

  return res.status(500).json({
    message: 'Unexpected server error.'
  });
});

export default app;