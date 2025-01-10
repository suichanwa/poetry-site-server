import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads/community-posts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `post-${uniqueSuffix}${path.extname(file.originalname)}`);
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

export default router;