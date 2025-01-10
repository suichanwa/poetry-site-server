import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { verifyToken } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<number, ExtendedWebSocket> = new Map();
  private reconnectAttempts: Map<number, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.init();
    this.setupHeartbeat();
  }

  private init() {
    this.wss.on('connection', async (ws: ExtendedWebSocket, req) => {
      try {
        const url = new URL(req.url!, `ws://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          ws.close(1008, 'No authentication token provided');
          return;
        }

        const user = await verifyToken(token);
        ws.userId = user.id;
        ws.isAlive = true;

        this.clients.set(user.id, ws);
        this.reconnectAttempts.delete(user.id);

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('message', this.handleMessage.bind(this));

        ws.on('close', () => {
          if (ws.userId) {
            this.clients.delete(ws.userId);
            this.handleDisconnection(ws.userId);
          }
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (!ws.isAlive) {
          if (ws.userId) {
            const attempts = this.reconnectAttempts.get(ws.userId) || 0;
            if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
              ws.terminate();
              this.reconnectAttempts.delete(ws.userId);
              return;
            }
            this.reconnectAttempts.set(ws.userId, attempts + 1);
          }
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private handleMessage(message: WebSocket.Data) {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'NEW_MESSAGE':
          this.broadcastToChat(data.chatId, {
            type: 'NEW_MESSAGE',
            chatId: data.chatId,
            message: data.message
          });
          break;
        case 'TYPING':
          this.broadcastToChat(data.chatId, {
            type: 'TYPING',
            chatId: data.chatId,
            userId: data.userId
          });
          break;
        case 'READ_RECEIPT':
          this.broadcastToChat(data.chatId, {
            type: 'READ_RECEIPT',
            chatId: data.chatId,
            messageId: data.messageId,
            userId: data.userId
          });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async broadcastToChat(chatId: number, data: any) {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { participants: true }
      });

      if (!chat) return;

      chat.participants.forEach(participant => {
        const client = this.clients.get(participant.id);
        if (client?.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('Error broadcasting to chat:', error);
    }
  }

  private handleDisconnection(userId: number) {
    const attempts = this.reconnectAttempts.get(userId) || 0;
    if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        // Client will attempt to reconnect
        this.reconnectAttempts.set(userId, attempts + 1);
      }, Math.min(1000 * Math.pow(2, attempts), 10000));
    }
  }
}

export let wsService: WebSocketService;

export const initWebSocket = (server: Server) => {
  wsService = new WebSocketService(server);
  return wsService;
};