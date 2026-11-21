import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth.routes.js';
import { departmentsRouter } from './routes/departments.routes.js';
import { filesRouter } from './routes/files.routes.js';
import { lettersRouter } from './routes/letters.routes.js';
import { downmarkingRouter } from './routes/downmarking.routes.js';
import { custodyRouter } from './routes/custody.routes.js';
import { barcodeRouter } from './routes/barcode.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { searchRouter } from './routes/search.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { shareRouter, publicSharedRouter } from './routes/share.routes.js';

export const app: Express = express();

// Security and Logging Middleware
app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'GovEDMS National Document & e-File API',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  });
});

// Primary API Endpoints
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/departments', departmentsRouter);
app.use('/api/v1/files', filesRouter);
app.use('/api/v1/letters', lettersRouter);
app.use('/api/v1/downmarkings', downmarkingRouter);
app.use('/api/v1/custody', custodyRouter);
app.use('/api/v1/barcode', barcodeRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/admin/users', usersRouter);
app.use('/api/v1/admin/settings', settingsRouter);
app.use('/api/v1/letters', shareRouter);
app.use('/api/v1/shared', publicSharedRouter);
app.use('/api/v1/search', searchRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route '${req.originalUrl}' not found on GovEDMS National Portal` });
});

// Central Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled System Exception:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Federal Server Error',
    code: err.code || 'SYS_ERR_500',
  });
});
