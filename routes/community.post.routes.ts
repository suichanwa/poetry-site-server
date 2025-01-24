import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/community-posts/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create a new post
router.post('/', authMiddleware, upload.array('images', 5), async (req: any, res) => {
  try {
    const { title, content, communityId } = req.body;
    const userId = req.user.id;

    // Check if user is a member of the community
    const isMember = await prisma.community.findFirst({
      where: {
        id: parseInt(communityId),
        members: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Must be a community member to post' });
    }

    // Process uploaded images
    const imageUrls = req.files ? 
      (req.files as Express.Multer.File[]).map(file => `/uploads/community-posts/${file.filename}`) 
      : [];

    const post = await prisma.communityPost.create({
      data: {
        title,
        content,
        images: imageUrls,
        authorId: userId,
        communityId: parseInt(communityId)
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    res.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get community posts
router.get('/community/:id', async (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const posts = await prisma.communityPost.findMany({
      where: {
        communityId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/posts', authMiddleware, upload.array('images', 5), async (req: any, res) => {
  try {
    const { title, content, communityId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Check if the user is a member of the community
    const isMember = await prisma.community.findFirst({
      where: {
        id: parseInt(communityId),
        members: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member of this community to create a post' });
    }

    const newPost = await prisma.communityPost.create({
      data: {
        title,
        content,
        author: {
          connect: { id: userId },
        },
        community: {
          connect: { id: parseInt(communityId) },
        },
        images: req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : []
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true }
        },
        images: true, 
        community: true
      }
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

export default router;