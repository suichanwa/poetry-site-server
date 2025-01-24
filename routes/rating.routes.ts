import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Rate a manga
router.post('/manga/:id/rate', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  const userId = req.user.id;

  try {
    const mangaId = parseInt(id);

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const existingRating = await prisma.mangaRating.findUnique({
      where: { mangaId_userId: { mangaId, userId } }
    });

    if (existingRating) {
      const updatedRating = await prisma.mangaRating.update({
        where: { mangaId_userId: { mangaId, userId } },
        data: { rating }
      });
      // Fetch and calculate new average and total ratings
      const ratings = await prisma.mangaRating.findMany({
          where: { mangaId },
          select: { rating: true }
      });
      const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      const total = ratings.length;

      return res.json({ ...updatedRating, average, total });
    }

    const newRating = await prisma.mangaRating.create({
      data: { mangaId, userId, rating }
    });

    // Fetch and calculate new average and total ratings
    const ratings = await prisma.mangaRating.findMany({
      where: { mangaId },
      select: { rating: true }
    });
    const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const total = ratings.length;

    return res.json({ ...newRating, average, total });
  } catch (error) {
    console.error('Error rating manga:', error);
    res.status(500).json({ error: 'Failed to rate manga' });
  }
});

// Get manga ratings
router.get('/manga/:id/ratings', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const mangaId = parseInt(id);

    const ratings = await prisma.mangaRating.findMany({
      where: { mangaId },
      select: { rating: true }
    });

    const average = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;
    const total = ratings.length;

    let userRating = null;
    if (userId) {
      const userRatingRecord = await prisma.mangaRating.findUnique({
        where: { mangaId_userId: { mangaId, userId } },
        select: { rating: true }
      });
      userRating = userRatingRecord?.rating || null;
    }

    res.json({ average, total, userRating });
  } catch (error) {
    console.error('Error fetching manga ratings:', error);
    res.status(500).json({ error: 'Failed to fetch manga ratings' });
  }
});

export default router;