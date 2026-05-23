import app from './app';
import env from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`DevPulse API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
