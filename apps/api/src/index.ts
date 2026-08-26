import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`===================================================`);
  console.log(` RazorRecover AI - API Server Running`);
  console.log(` Environment: ${env.NODE_ENV}`);
  console.log(` Port: ${env.PORT}`);
  console.log(` Health check: http://localhost:${env.PORT}/health`);
  console.log(`===================================================`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
