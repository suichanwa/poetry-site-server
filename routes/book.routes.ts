// server/routes/book.routes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Create a new book
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const coverImage = req.file?.path;

    if (!title || !description || !coverImage) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const book = await prisma.book.create({
      data: {
        title,
        description,
        coverImage,
        authorId: req.user.id,
      },
    });

    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

export default router;