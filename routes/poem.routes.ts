// server/routes/poem.routes.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { poemService } from '../services/poem.service';

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/poems/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `poem-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC files are allowed'));
    }
  }
});

router.get('/', async (req, res) => {
  try {
    const poems = await prisma.poem.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        tags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(poems);
  } catch (error) {
    console.error('Error fetching poems:', error);
    res.status(500).json({ error: 'Failed to fetch poems' });
  }
});


router.post('/', authMiddleware, upload.single('poemFile'), async (req: any, res) => {
  try {
    const { title, content, tags = [], formatting = {} } = JSON.parse(req.body.data);
    const userId = req.user.id;

    const poemData: any = {
      title,
      content,
      authorId: userId,
      formatting: formatting ? JSON.stringify(formatting) : null, // Convert to string for JSON field
      tags: {
        connectOrCreate: tags.map((tag: string) => ({
          where: { name: tag },
          create: { name: tag }
        }))
      }
    };

    if (req.file) {
      poemData.file = `/uploads/poems/${req.file.filename}`;
    }

    const poem = await prisma.poem.create({
      data: poemData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        tags: true
      }
    });

    // Parse formatting back to object before sending response
    const responsePoem = {
      ...poem,
      formatting: poem.formatting ? JSON.parse(poem.formatting as string) : null
    };

    res.json(responsePoem);
  } catch (error) {
    console.error('Error creating poem:', error);
    res.status(500).json({ error: 'Failed to create poem' });
  }
});

// Get bookmark status
router.get('/:id/bookmark/status', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    if (isNaN(poemId)) {
      return res.status(400).json({ error: 'Invalid poem ID' });
    }

    const result = await poemService.getBookmarkStatus(req.user.id, poemId);
    res.json(result);
  } catch (error) {
    console.error('Bookmark status error:', error);
    res.status(500).json({ error: 'Failed to get bookmark status' });
  }
});

// Toggle bookmark
router.post('/:id/bookmark', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    if (isNaN(poemId)) {
      return res.status(400).json({ error: 'Invalid poem ID' });
    }

    const result = await poemService.toggleBookmark(req.user.id, poemId);
    res.json(result);
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// Get poems by user
router.get('/user/:id', authMiddleware, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const poems = await prisma.poem.findMany({
      where: {
        authorId: userId
      },
      include: {
        author: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    res.json(poems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user poems' });
  }
});

// Get bookmarked poems by user
router.get('/user/:id/bookmarks', authMiddleware, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if userId is valid
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Verify if the user is requesting their own bookmarks
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view these bookmarks' });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: userId
      },
      include: {
        poem: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            tags: true,
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          }
        }
      }
    });

    const poems = bookmarks.map(bookmark => ({
      ...bookmark.poem,
      isBookmarked: true
    }));

    res.json(poems);
  } catch (error) {
    console.error('Error fetching bookmarked poems:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarked poems' });
  }
});

// Get single poem
router.get('/:id', async (req, res) => {
  try {
    const poemId = parseInt(req.params.id);
    
    if (isNaN(poemId)) {
      return res.status(400).json({ error: 'Invalid poem ID' });
    }

    const poem = await prisma.poem.findUnique({
      where: { id: poemId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        tags: true
      }
    });

    if (!poem) {
      return res.status(404).json({ error: 'Poem not found' });
    }

    res.json(poem);
  } catch (error) {
    console.error('Error fetching poem:', error);
    res.status(500).json({ error: 'Failed to fetch poem' });
  }
});

// Add comment route
router.post('/:id/comments', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.user.id;

    // First get the poem to find its author
    const poem = await prisma.poem.findUnique({
      where: { id: poemId },
      select: {
        authorId: true,
        title: true
      }
    });

    if (!poem) {
      return res.status(404).json({ error: 'Poem not found' });
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        poemId,
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

    // Create notification if someone else comments on the poem
    if (poem.authorId !== userId) {
      await prisma.notification.create({
        data: {
          type: 'COMMENT',
          content: `${req.user.name} commented on your poem "${poem.title}"`,
          recipientId: poem.authorId,
          senderId: userId,
          poemId: poemId,
          commentId: comment.id,
          link: `/poem/${poemId}#comment-${comment.id}`,
          isRead: false
        }
      });
    }

    res.json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const poemId = parseInt(req.params.id);
    
    const comments = await prisma.comment.findMany({
      where: {
        poemId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true
          }
        }
      }
    });

    // Transform the data to include like count
    const commentsWithLikes = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
      likes: comment._count.likes
    }));

    res.json(commentsWithLikes);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Move this route BEFORE any routes with :id parameter to prevent conflicts
router.delete('/:id/like', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    const userId = req.user.id;

    const existingLike = await prisma.like.findFirst({
      where: {
        poemId,
        userId,
        commentId: null // Only handle poem likes
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      });
    }

    const likeCount = await prisma.like.count({
      where: {
        poemId,
        commentId: null // Only count poem likes
      }
    });

    res.json({ 
      liked: false,
      likeCount 
    });
  } catch (error) {
    console.error('Error removing like:', error);
    res.status(500).json({ error: 'Failed to remove like' });
  }
});

// Get like status
router.get('/:id/like/status', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    const userId = req.user.id;

    const like = await prisma.like.findFirst({
      where: {
        poemId,
        userId,
      },
    });

    const likeCount = await prisma.like.count({
      where: {
        poemId,
      },
    });

    res.json({ 
      liked: !!like,
      likeCount 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get like status' });
  }
});

// In the like endpoint
router.post('/:id/like', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    const userId = req.user.id;

    const poem = await prisma.poem.findUnique({
      where: { id: poemId },
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!poem) {
      return res.status(404).json({ error: 'Poem not found' });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        poemId,
        userId,
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
    } else {
      await prisma.like.create({
        data: {
          userId,
          poemId,
        }
      });

      // Create notification only if the liker is not the poem author
      if (poem.author.id !== userId) {
        await prisma.notification.create({
          data: {
            type: 'LIKE',
            content: `${req.user.name} liked your poem "${poem.title}"`,
            recipientId: poem.author.id,
            senderId: userId,
            poemId: poemId,
            link: `/poem/${poemId}`,
            isRead: false
          }
        });
      }
    }

    const likeCount = await prisma.like.count({
      where: {
        poemId,
      }
    });

    res.json({ 
      liked: !existingLike,
      likeCount 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Get comment like status
router.get('/comments/:id/like/status', authMiddleware, async (req: any, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user.id;

    const like = await prisma.like.findFirst({
      where: {
        commentId,
        userId,
      }
    });

    const likeCount = await prisma.like.count({
      where: {
        commentId
      }
    });

    res.json({ 
      liked: !!like,
      likeCount 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get comment like status' });
  }
});

// Toggle comment like
router.post('/comments/:id/like', authMiddleware, async (req: any, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        commentId,
        userId,
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      });
    } else {
      await prisma.like.create({
        data: {
          userId,
          commentId,
        }
      });

      // Create notification if someone else likes the comment
      if (comment.userId !== userId) {
        await notificationService.createNotification({
          type: 'LIKE',
          content: `${req.user.name} liked your comment`,
          recipientId: comment.userId,
          senderId: userId,
          commentId: commentId,
          link: `/poem/${comment.poemId}#comment-${commentId}`
        });
      }
    }

    const likeCount = await prisma.like.count({
      where: {
        commentId
      }
    });

    res.json({ 
      liked: !existingLike,
      likeCount 
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Get all tags
router.get('/tags', async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Add tags to poem
router.post('/:id/tags', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    const { tags } = req.body;
    
    // Check if user owns the poem
    const poem = await prisma.poem.findFirst({
      where: {
        id: poemId,
        authorId: req.user.id
      }
    });

    if (!poem) {
      return res.status(403).json({ error: 'Not authorized to modify this poem' });
    }

    const updatedPoem = await prisma.poem.update({
      where: { id: poemId },
      data: {
        tags: {
          connectOrCreate: tags.map((tag: string) => ({
            where: { name: tag },
            create: { name: tag }
          }))
        }
      },
      include: {
        tags: true
      }
    });

    res.json(updatedPoem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const poemId = parseInt(req.params.id);
    
    if (isNaN(poemId)) {
      return res.status(400).json({ error: 'Invalid poem ID' });
    }

    const updatedPoem = await prisma.poem.update({
      where: { id: poemId },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });

    res.json({ viewCount: updatedPoem.viewCount });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ error: 'Failed to increment view count' });
  }
});

// Add this route to get popular poems
// Add this route to get popular poems
router.get('/popular', async (_req, res) => {
  try {
    const popularPoems = await prisma.poem.findMany({
      take: 5, // Limit to 5 poems
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });
    res.json(popularPoems);
  } catch (error) {
    console.error('Error fetching popular poems:', error);
    res.status(500).json({ error: 'Failed to fetch popular poems' });
  }
});

// server/routes/poem.routes.ts
// Add this route to fetch poems from followed users
// Add this route to fetch poems from followed users
router.get('/following', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // First get all users that the current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);

    // Then get poems from those users
    const poems = await prisma.poem.findMany({
      where: {
        authorId: {
          in: followingIds
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(poems);
  } catch (error) {
    console.error('Error fetching following poems:', error);
    res.status(500).json({ error: 'Failed to fetch poems from followed users' });
  }
});

// Toggle comment like
router.delete('/comments/:id/like', authMiddleware, async (req: any, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        commentId,
        userId,
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      });
    }

    const likeCount = await prisma.like.count({
      where: {
        commentId
      }
    });

    res.json({ 
      liked: false,
      likeCount 
    });
  } catch (error) {
    console.error('Error removing comment like:', error);
    res.status(500).json({ error: 'Failed to remove like' });
  }
});

// Update poem
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const poemId = parseInt(req.params.id);
    const { title, content, tags, formatting } = req.body;
    const userId = req.user.id;

    // First check if user owns this poem
    const poem = await prisma.poem.findFirst({
      where: {
        id: poemId,
        authorId: userId
      }
    });

    if (!poem) {
      return res.status(403).json({ error: 'Not authorized to edit this poem' });
    }

    // Update poem
    const updatedPoem = await prisma.poem.update({
      where: { id: poemId },
      data: {
        title,
        content,
        formatting: formatting ? JSON.stringify(formatting) : null,
        // Remove all existing tags and add new ones
        tags: {
          set: [], // Clear existing tags
          connectOrCreate: tags.map((tag: string) => ({
            where: { name: tag },
            create: { name: tag }
          }))
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        tags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    // Parse formatting back to object before sending response
    const responsePoem = {
      ...updatedPoem,
      formatting: updatedPoem.formatting ? JSON.parse(updatedPoem.formatting as string) : null
    };

    res.json(responsePoem);
  } catch (error) {
    console.error('Error updating poem:', error);
    res.status(500).json({ error: 'Failed to update poem' });
  }
});

export default router;