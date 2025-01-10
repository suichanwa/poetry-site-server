import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Get all notifications
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
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
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notification preferences
router.get('/preferences', authMiddleware, async (req: any, res) => {
  try {
    const preferences = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        emailLikes: true,
        emailComments: true,
        emailFollows: true,
        pushLikes: true,
        pushComments: true,
        pushFollows: true
      }
    });
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update notification preferences
router.put('/preferences', authMiddleware, async (req: any, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        emailLikes: req.body.emailLikes ?? undefined,
        emailComments: req.body.emailComments ?? undefined,
        emailFollows: req.body.emailFollows ?? undefined,
        pushLikes: req.body.pushLikes ?? undefined,
        pushComments: req.body.pushComments ?? undefined,
        pushFollows: req.body.pushFollows ?? undefined
      },
      select: {
        emailLikes: true,
        emailComments: true,
        emailFollows: true,
        pushLikes: true,
        pushComments: true,
        pushFollows: true
      }
    });
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Mark notification as read
router.post('/:id/mark-read', authMiddleware, async (req: any, res) => {
  try {
    const notification = await prisma.notification.update({
      where: {
        id: parseInt(req.params.id),
        recipientId: req.user.id
      },
      data: {
        isRead: true
      }
    });
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', authMiddleware, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        recipientId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router;