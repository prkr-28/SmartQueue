import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketClient {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        // Connected
      });

      this.socket.on('disconnect', () => {
        // Disconnected
      });
    }
    return this.socket;
  }

  getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  joinHospital(hospitalId: string) {
    if (this.socket && hospitalId) {
      this.socket.emit('join:hospital', hospitalId);
    }
  }

  leaveHospital(hospitalId: string) {
    if (this.socket && hospitalId) {
      this.socket.emit('leave:hospital', hospitalId);
    }
  }

  joinPatient(patientId: string) {
    if (this.socket && patientId) {
      this.socket.emit('join:patient', patientId);
    }
  }

  leavePatient(patientId: string) {
    if (this.socket && patientId) {
      this.socket.emit('leave:patient', patientId);
    }
  }

  joinDoctor(doctorId: string) {
    if (this.socket && doctorId) {
      this.socket.emit('join:doctor', doctorId);
    }
  }

  leaveDoctor(doctorId: string) {
    if (this.socket && doctorId) {
      this.socket.emit('leave:doctor', doctorId);
    }
  }
}

export const socketClient = new SocketClient();
