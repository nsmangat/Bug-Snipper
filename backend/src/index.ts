import 'dotenv/config';
import express from 'express';
import { env } from './config/env.js';
import { dashboardCors, publicCors } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { publicApiRateLimiter } from './middleware/rateLimiter.js';
import { publicDomainsRouter } from './routes/domains.routes.js';
import { publicReportsRouter, reportsRouter } from './routes/reports.routes.js';

const app = express();

// Restricting for screenshots
app.use(express.json({ limit: '10mb' }));

app.use(
  '/api/public/domains',
  publicCors,
  publicApiRateLimiter,
  publicDomainsRouter,
);

app.use(
  '/api/public/reports',
  publicCors,
  publicApiRateLimiter,
  publicReportsRouter,
);

app.use('/api/reports', dashboardCors, reportsRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server is running at http://localhost:${env.port}`);
});
