import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Rate a light novel
router.post('/lightnovel/:id/rate', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  try {
    const lightNovelId = parseInt(id);

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const existingRating = await prisma.lightNovelRating.findUnique({
      where: { lightNovelId_userId: { lightNovelId, userId } }
    });

    if (existingRating) {
      const updatedRating = await prisma.lightNovelRating.update({
        where: { lightNovelId_userId: { lightNovelId, userId } },
        data: { rating, comment }
      });
      return res.json(updatedRating);
    }

    const newRating = await prisma.lightNovelRating.create({
      data: { lightNovelId, userId, rating, comment }
    });

    res.json(newRating);
  } catch (error) {
    console.error('Error rating light novel:', error);
    res.status(500).json({ error: 'Failed to rate light novel' });
  }
});

// Get light novel ratings
router.get('/lightnovel/:id/ratings', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const lightNovelId = parseInt(id);

    const ratings = await prisma.lightNovelRating.findMany({
      where: { lightNovelId },
      select: { rating: true }
    });

    const average = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;
    const total = ratings.length;

    let userRating = null;
    if (userId) {
      const userRatingRecord = await prisma.lightNovelRating.findUnique({
        where: { lightNovelId_userId: { lightNovelId, userId } },
        select: { rating: true }
      });
      userRating = userRatingRecord?.rating || null;
    }

    res.json({ average, total, userRating });
  } catch (error) {
    console.error('Error fetching light novel ratings:', error);
    res.status(500).json({ error: 'Failed to fetch light novel ratings' });
  }
});

export default router;