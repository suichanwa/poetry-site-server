import { PrismaClient, NotificationType } from '@prisma/client';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

class SystemNotificationService {
  async sendSystemNotification({
    type,
    title,
    content,
    link,
    userIds
  }: {
    type: 'SYSTEM' | 'ACCOUNT_UPDATE' | 'SECURITY_ALERT' | 'FEATURE_ANNOUNCEMENT';
    title: string;
    content: string;
    link?: string;
    userIds?: number[]; // If not provided, send to all users
  }) {
    try {
      const users = await prisma.user.findMany({
        where: userIds ? { id: { in: userIds } } : {},
        select: { id: true }
      });

      const notifications = await Promise.all(
        users.map(user =>
          notificationService.createNotification({
            type: type as NotificationType,
            content: `${title}\n${content}`,
            recipientId: user.id,
            link,
            isSystem: true
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error sending system notification:', error);
      throw error;
    }
  }

  async sendFeatureAnnouncement({
    title,
    content,
    link
  }: {
    title: string;
    content: string;
    link?: string;
  }) {
    return this.sendSystemNotification({
      type: 'FEATURE_ANNOUNCEMENT',
      title,
      content,
      link
    });
  }

  async sendAccountUpdate({
    userId,
    title,
    content,
    link
  }: {
    userId: number;
    title: string;
    content: string;
    link?: string;
  }) {
    return this.sendSystemNotification({
      type: 'ACCOUNT_UPDATE',
      title,
      content,
      link,
      userIds: [userId]
    });
  }

  async sendSecurityAlert({
    userId,
    title,
    content,
    link
  }: {
    userId: number;
    title: string;
    content: string;
    link?: string;
  }) {
    return this.sendSystemNotification({
      type: 'SECURITY_ALERT',
      title,
      content,
      link,
      userIds: [userId]
    });
  }
}

export const systemNotificationService = new SystemNotificationService();