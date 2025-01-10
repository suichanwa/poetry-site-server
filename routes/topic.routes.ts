import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Create topic
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { title, description, communityId } = req.body;
    const userId = req.user.id;

    // Check if user is moderator or creator
    const community = await prisma.community.findFirst({
      where: {
        id: communityId,
        OR: [
          { creatorId: userId },
          { moderators: { some: { id: userId } } }
        ]
      }
    });

    if (!community) {
      return res.status(403).json({ error: 'Not authorized to create topics' });
    }

    const topic = await prisma.topic.create({
      data: {
        title,
        description,
        communityId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json(topic);
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// Get community topics
router.get('/community/:id', async (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const topics = await prisma.topic.findMany({
      where: { communityId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: { threads: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// Update topic (pin/lock)
router.patch('/:id', authMiddleware, async (req: any, res) => {
  try {
    const topicId = parseInt(req.params.id);
    const { isPinned, isLocked } = req.body;
    const userId = req.user.id;

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { community: true }
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if user has permission
    const hasPermission = await prisma.community.findFirst({
      where: {
        id: topic.communityId,
        OR: [
          { creatorId: userId },
          { moderators: { some: { id: userId } } }
        ]
      }
    });

    if (!hasPermission) {
      return res.status(403).json({ error: 'Not authorized to modify topic' });
    }

    const updatedTopic = await prisma.topic.update({
      where: { id: topicId },
      data: { isPinned, isLocked },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json(updatedTopic);
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

export default router;