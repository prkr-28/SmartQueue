import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { socketService } from './services/socket.service.js';
import { initAppointmentCrons } from './cron/appointment.cron.js';

const startServer = async () => {
  try {
    // 1. Connect to Database (Atlas)
    await connectDatabase();

    // 2. Initialize Express application
    const app = createApp();

    // 3. Create HTTP server
    const server = http.createServer(app);

    // 4. Initialize Socket.IO
    await socketService.init(server);

    // 5. Initialize Crons (skip in test)
    if (env.NODE_ENV !== 'test') {
      initAppointmentCrons();
    }

    // 6. Start listening
    const PORT = env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`SmartQueue API server running on port ${PORT} [${env.NODE_ENV}]`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 10s if hung
      setTimeout(() => {
        logger.error('Forcefully terminating process after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Fatal error during server startup');
    process.exit(1);
  }
};

startServer();
