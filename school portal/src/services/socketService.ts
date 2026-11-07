import { io, Socket } from 'socket.io-client';

type EventListener = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private listeners = new Map<string, EventListener[]>();

  async connect(token: string) {
    try {
      if (this.socket) {
        this.disconnect();
      }

      const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://spark-school-management-portal.onrender.com/api';
      const WS_BASE_URL = API_BASE_URL.startsWith('http') ? API_BASE_URL.replace(/\/api\/?$/, '') : window.location.origin;
      
      console.log('🔌 School Portal: Connecting to WebSocket:', WS_BASE_URL);
      
      this.socket = io(WS_BASE_URL, {
        auth: {
          token: token
        },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 3
      });

      this.socket.on('connect', () => {
        console.log('🔌 School Portal: WebSocket connected successfully');
        this.isConnected = true;
        this.emit('connection_status', { connected: true });
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 School Portal: WebSocket disconnected');
        this.isConnected = false;
        this.emit('connection_status', { connected: false });
      });

      this.socket.on('connect_error', (error) => {
        console.log('⚠️ School Portal: WebSocket connection failed:', error.message);
        this.isConnected = false;
        this.emit('connection_error', error);
      });

      // Listen for attendance updates
      this.socket.on('attendance_updated', (data) => {
        console.log('📊 School Portal: Received attendance update:', data);
        this.emit('attendance_updated', data);
      });

    } catch (error) {
      console.error('❌ School Portal: WebSocket connection error:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 School Portal: WebSocket disconnected');
    }
  }

  // Event listener methods
  on(event: string, callback: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: EventListener) {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in ${event} listener:`, error);
        }
      });
    }
  }

  get isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

export default new SocketService();
