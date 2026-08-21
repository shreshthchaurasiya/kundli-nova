import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import routesV1 from './routes/v1';
import { errorHandler, notFoundHandler } from './middleware/error';
import { env } from './config/env';

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.ALLOWED_ORIGINS === '*' ? '*' : env.ALLOWED_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
}));

// Rate limiting (basic anti-abuse)
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  max: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, xForwardedForHeader: false },
  skip: (req) => {
    if (env.NODE_ENV === 'test') return true;
    return /^\/v1\/consultations\/[^\/]+\/heartbeat\/?$/.test(req.path);
  },
});
app.use('/api', limiter);

// Request parsing & Logging
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan('combined'));

// API Routes
app.use('/api/v1', routesV1);

// 404 & Error Handling for API only
app.use('/api', notFoundHandler);
app.use('/api', errorHandler);

export default app;
