import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/books');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

router.post('/', authMiddleware, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const coverImage = req.file ? `/uploads/books/${req.file.filename}` : null;

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

// Get user's books
router.get('/:id/books', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const books = await prisma.book.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(books);
  } catch (error) {
    console.error('Error fetching user books:', error);
    res.status(500).json({ error: 'Failed to fetch user books' });
  }
});

// Get user's books
router.get('/user/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const books = await prisma.book.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(books);
  } catch (error) {
    console.error('Error fetching user books:', error);
    res.status(500).json({ error: 'Failed to fetch user books' });
  }
});

export default router;