import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Follow a user
router.post('/:id', authMiddleware, async (req: any, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.id;

    // Validate IDs
    if (isNaN(followingId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if trying to follow self
    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    });

    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      }
    });

    // Create notification for the followed user
    await prisma.notification.create({
      data: {
        type: 'FOLLOW',
        content: `${req.user.name} started following you`,
        recipientId: followingId,
        senderId: followerId,
        isRead: false,
        link: `/profile/${followerId}`
      }
    });

    res.json({ success: true, isFollowing: true });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.id;

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    res.json({ success: true, isFollowing: false });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Check follow status
router.get('/:id/status', authMiddleware, async (req: any, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.id;

    if (isNaN(followingId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    res.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

// Get followers
router.get('/:id/followers', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists first
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const followers = await prisma.follow.findMany({
      where: {
        followingId: userId,
      },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json(followers.map(f => f.follower));
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get following
router.get('/:id/following', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists first
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json(following.map(f => f.following));
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});
export default router;