import { PrismaClient, NotificationType, Notification } from '@prisma/client';
import { WebSocket } from 'ws';

const prisma = new PrismaClient();

class NotificationService {
  private wsConnections: Map<number, WebSocket> = new Map();

  async getUserNotifications(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    try {
      const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where: { recipientId: userId },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.notification.count({
          where: { recipientId: userId }
        })
      ]);

      return {
        notifications,
        pagination: {
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          currentPage: page,
          perPage: limit
        }
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async createNotification(data: {
    type: NotificationType;
    content: string;
    recipientId: number;
    senderId?: number;
    poemId?: number;
    link?: string;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          type: data.type,
          content: data.content,
          recipient: { connect: { id: data.recipientId } },
          sender: data.senderId ? { connect: { id: data.senderId } } : undefined,
          poem: data.poemId ? { connect: { id: data.poemId } } : undefined,
          link: data.link
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      this.sendRealtimeNotification(data.recipientId, notification);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: number, userId: number) {
    return prisma.notification.update({
      where: {
        id: notificationId,
        recipientId: userId
      },
      data: { isRead: true }
    });
  }

  async markAllAsRead(userId: number) {
    return prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false
      },
      data: { isRead: true }
    });
  }

  private sendRealtimeNotification(userId: number, notification: Notification) {
    const userSocket = this.wsConnections.get(userId);
    if (userSocket?.readyState === WebSocket.OPEN) {
      userSocket.send(JSON.stringify({
        type: 'NEW_NOTIFICATION',
        notification: {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        }
      }));
    }
  }

  addConnection(userId: number, ws: WebSocket) {
    this.wsConnections.set(userId, ws);
  }

  removeConnection(userId: number) {
    this.wsConnections.delete(userId);
  }
}

export const notificationService = new NotificationService();