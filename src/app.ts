import express from 'express';
import cors from 'cors';
import { StatusCodes } from 'http-status-codes';
import { errorHandler } from './middleware/errorHandler';
import { sendError } from './utils/response';

const app = express();

app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

import authRoutes from './modules/auth/auth.routes';
import issuesRoutes from './modules/issues/issues.routes';

app.use('/api/auth', authRoutes);
app.use('/api/issues', issuesRoutes);

app.use((_req, res) => {
  sendError(res, StatusCodes.NOT_FOUND, 'Route not found');
});

app.use(errorHandler);

export default app;
