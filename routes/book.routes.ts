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

// Get all books
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
        }
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

// Get single book by ID
router.get('/:id', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        bookLikes: {
          where: {
            userId: req.user?.id
          }
        }
      }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const isLiked = book.bookLikes.length > 0;
    res.json({ ...book, isLiked });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    await prisma.book.update({
      where: { id: bookId },
      data: {
        views: {
          increment: 1
        }
      }
    });
    res.status(204).end();
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ error: 'Failed to increment view count' });
  }
});

// Like a book
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const userId = req.user.id;

    const existingLike = await prisma.bookLike.findUnique({
      where: {
        bookId_userId: {
          bookId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.bookLike.delete({
        where: {
          bookId_userId: { bookId, userId }
        }
      });
    } else {
      await prisma.bookLike.create({
        data: {
          bookId,
          userId
        }
      });
    }

    const likeCount = await prisma.bookLike.count({
      where: { bookId }
    });

    res.json({ liked: !existingLike, likeCount });
  } catch (error) {
    console.error('Error liking book:', error);
    res.status(500).json({ error: 'Failed to like book' });
  }
});

// Add comment to book
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;

    const comment = await prisma.bookComment.create({
      data: {
        content,
        userId,
        bookId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Like a comment
router.post('/comments/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.id;

    const existingLike = await prisma.bookCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.bookCommentLike.delete({
        where: {
          commentId_userId: { commentId, userId }
        }
      });
    } else {
      await prisma.bookCommentLike.create({
        data: {
          commentId,
          userId
        }
      });
    }

    const likeCount = await prisma.bookCommentLike.count({
      where: { commentId }
    });

    res.json({ liked: !existingLike, likeCount });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// Get like status of a comment
router.get('/comments/:commentId/like/status', authMiddleware, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.id;

    const like = await prisma.bookCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      }
    });

    const likeCount = await prisma.bookCommentLike.count({
      where: { commentId }
    });

    res.json({ liked: !!like, likeCount });
  } catch (error) {
    console.error('Error fetching like status:', error);
    res.status(500).json({ error: 'Failed to fetch like status' });
  }
});

// Remove like from a comment
router.delete('/comments/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.id;

    const existingLike = await prisma.bookCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.bookCommentLike.delete({
        where: {
          commentId_userId: { commentId, userId }
        }
      });
    }

    const likeCount = await prisma.bookCommentLike.count({
      where: { commentId }
    });

    res.json({ liked: false, likeCount });
  } catch (error) {
    console.error('Error removing like from comment:', error);
    res.status(500).json({ error: 'Failed to remove like from comment' });
  }
});

// Get book content for reading
router.get('/:id/read', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        title: true,
        content: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    console.error('Error fetching book content:', error);
    res.status(500).json({ error: 'Failed to fetch book content' });
  }
});

// Get books by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    console.log(`Fetching books for user ID: ${userId}`); // Add logging
    const books = await prisma.book.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true,
            bookLikes: true
          }
        }
      }
    });

    console.log(`Fetched books: ${JSON.stringify(books)}`); // Add logging
    res.json(books);
  } catch (error) {
    console.error('Error fetching user books:', error);
    res.status(500).json({ error: 'Failed to fetch user books' });
  }
});

// Create a new book
router.post('/', authMiddleware, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, content } = req.body;
    const userId = req.user.id;
    const coverImage = req.file ? `/uploads/books/${req.file.filename}` : null;

    console.log('Creating book with data:', { title, description, content, coverImage, userId }); // Add logging

    const book = await prisma.book.create({
      data: {
        title,
        description,
        content, // Ensure content is included
        coverImage,
        authorId: userId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

export default router;