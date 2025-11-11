// src/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import transmissionRoutes from './routes/transmissionRoutes.js';
import mbrAnalogRoutes from './routes/mbrAnalogRoutes.js';
import msrRoutes from './routes/msrRoutes.js';
import mstRoutes from './routes/mstRoutes.js';
import reportRoutes from './routes/report.routes.js';
import rwphRoutes from './routes/rwphRoutes.js';
import cwphRoutes from './routes/cwphRoutes.js';
import vandalismRoutes from './routes/vandalismRoutes.js';

import { startCronJobs } from './cronjobs/dailyReportCron.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Allowlist acceptable browser origins:
 * - Any localhost / 127.0.0.1 port (Flutter web often runs on random ports)
 * - Your LAN IP (edit/remove as needed)
 */
const allowlist = [
  /^http:\/\/localhost:\d+$/,        // http://localhost:<any>
  /^http:\/\/127\.0\.0\.1:\d+$/,     // http://127.0.0.1:<any>
  /^http:\/\/192\.168\.123\.154:\d+$/, // http://192.168.123.154:<any>  <-- adjust for your LAN
  /^http:\/\/65\.2\.129\.140:\d+$/ // new IP with any port
];

// Make cache/CDNs vary by Origin
app.use((req, res, next) => {
  res.header('Vary', 'Origin');
  next();
});

// Dynamic CORS options
const corsOptionsDelegate = (req, cb) => {
  const origin = req.header('Origin');

  // Allow non-browser tools (curl/Postman) with no Origin
  if (!origin) return cb(null, { origin: true, credentials: true });

  const isAllowed = allowlist.some(rule =>
    typeof rule === 'string' ? rule === origin : rule.test(origin)
  );

  if (isAllowed) {
    cb(null, {
      origin: true, // echo the request origin
      credentials: true, // set true only if you use cookies/auth headers
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    cb(new Error('Not allowed by CORS'));
  }
};

// CORS middleware
app.use(cors(corsOptionsDelegate));

// ✅ Express 5: use '(.*)' instead of '*'
app.options('(.*)', cors(corsOptionsDelegate)); // handle preflight for all routes

// Body parsing
app.use(express.json());

// ✅ API Routes
app.use('/api/transmission', transmissionRoutes);
app.use('/api/mbr-analog', mbrAnalogRoutes);
app.use('/api/msr-analog', msrRoutes);
app.use('/api/mst-analog', mstRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/rwph', rwphRoutes);
app.use('/api/cwph', cwphRoutes);
app.use('/api/vandalism', vandalismRoutes);

// ✅ Start cron jobs
startCronJobs();

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
