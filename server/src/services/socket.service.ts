import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { SocketQueueUpdatePayload, SocketDisplayPayload, SocketTurnNearPayload } from '@smartqueue/shared';

class SocketService {
  private io: SocketIOServer | null = null;

  async init(httpServer: HttpServer): Promise<SocketIOServer> {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    if (env.REDIS_URL) {
      try {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const { Redis } = await import('ioredis');
        const pubClient = new Redis(env.REDIS_URL);
        const subClient = pubClient.duplicate();
        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.IO Redis adapter enabled for multi-node horizontal scaling');
      } catch (err) {
        logger.error({ err }, 'Failed to initialize Redis adapter for Socket.IO');
      }
    }

    this.io.on('connection', (socket: Socket) => {
      logger.debug({ socketId: socket.id }, 'Socket connected');

      // Join doctor room (for doctor's live queue dashboard)
      socket.on('join:doctor', (doctorId: string) => {
        if (doctorId) {
          socket.join(`doctor:${doctorId}`);
          logger.debug({ socketId: socket.id, room: `doctor:${doctorId}` }, 'Joined doctor room');
        }
      });

      // Leave doctor room
      socket.on('leave:doctor', (doctorId: string) => {
        if (doctorId) {
          socket.leave(`doctor:${doctorId}`);
        }
      });

      // Join hospital room (for waiting room public display boards)
      socket.on('join:hospital', (hospitalId: string) => {
        if (hospitalId) {
          socket.join(`hospital:${hospitalId}`);
          logger.debug({ socketId: socket.id, room: `hospital:${hospitalId}` }, 'Joined hospital room');
        }
      });

      // Leave hospital room
      socket.on('leave:hospital', (hospitalId: string) => {
        if (hospitalId) {
          socket.leave(`hospital:${hospitalId}`);
        }
      });

      // Join patient personal room (for live position and turn-near alerts)
      socket.on('join:patient', (patientId: string) => {
        if (patientId) {
          socket.join(`patient:${patientId}`);
          logger.debug({ socketId: socket.id, room: `patient:${patientId}` }, 'Joined patient room');
        }
      });

      // Leave patient personal room
      socket.on('leave:patient', (patientId: string) => {
        if (patientId) {
          socket.leave(`patient:${patientId}`);
        }
      });

      socket.on('disconnect', (reason) => {
        logger.debug({ socketId: socket.id, reason }, 'Socket disconnected');
      });
    });

    logger.info('Socket.IO initialized');
    return this.io;
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO has not been initialized yet');
    }
    return this.io;
  }

  // Emits real-time updates to doctor's queue
  emitQueueUpdate(doctorId: string, payload: SocketQueueUpdatePayload): void {
    if (!this.io) return;
    this.io.to(`doctor:${doctorId}`).emit('queue:update', payload);
  }

  // Emits update to public hospital waiting-room display
  emitDisplayUpdate(hospitalId: string, payload: SocketDisplayPayload): void {
    if (!this.io) return;
    this.io.to(`hospital:${hospitalId}`).emit('display:update', payload);
  }

  // Emits personalized alert when turn is near (<= 3 patients ahead)
  emitTurnNear(patientId: string, payload: SocketTurnNearPayload): void {
    if (!this.io) return;
    this.io.to(`patient:${patientId}`).emit('patient:turn_near', payload);
  }

  // Emits appointment status update to patient
  emitAppointmentUpdate(patientId: string, payload: { appointmentId: string; status: string }): void {
    if (!this.io) return;
    this.io.to(`patient:${patientId}`).emit('appointment:update', payload);
  }

  // Broadcasts a global or hospital alert
  broadcastHospitalAlert(hospitalId: string, alert: { title: string; message: string }): void {
    if (!this.io) return;
    this.io.to(`hospital:${hospitalId}`).emit('hospital:alert', alert);
  }
}

export const socketService = new SocketService();
