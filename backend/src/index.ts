import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/database';
import { initializeFirebase } from './config/firebase';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.PORT || '3000', 10);

const ensureDirectories = (): void => {
  const dirs = [
    path.join(process.cwd(), 'uploads', 'invoices'),
    path.join(process.cwd(), 'logs'),
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const bootstrap = async (): Promise<void> => {
  try {
    ensureDirectories();

    await connectDatabase();

    initializeFirebase();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 CarWash API running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`📍 Health check: http://localhost:${PORT}/health`);
    });

    const shutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err: Error) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

bootstrap();
