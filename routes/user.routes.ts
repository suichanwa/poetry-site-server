// server/routes/user.routes.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { fileURLToPath } from 'url';

const router = express.Router();
const prisma = new PrismaClient();

// Define __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'banners');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `banner-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadBanner = multer({
  storage: bannerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed'));
      return;
    }
    cb(null, true);
  }
});

const upload = multer({ storage });

router.post('/:id/avatar', authMiddleware, upload.single('avatar'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = parseInt(req.params.id);
    
    // Create relative path for storage - this should match how you're trying to access it
    const relativePath = `/uploads/${path.basename(req.file.path)}`;

    // Update user's avatar and bio in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        avatar: relativePath,
        name: req.body.name,
        bio: req.body.bio
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        banner: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user by username
router.get('/username/:username', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { 
        name: req.params.username 
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, bio } = req.body;

    // Make sure user can only update their own profile
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        bio,
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

router.put('/:id/avatar-settings', authMiddleware, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isAnimatedAvatar, avatarAnimation, avatarStyle } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isAnimatedAvatar,
        avatarAnimation,
        avatarStyle
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating avatar settings:', error);
    res.status(500).json({ error: 'Failed to update avatar settings' });
  }
});

router.post('/:id/banner', authMiddleware, uploadBanner.single('banner'), async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const bannerPath = `/uploads/banners/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { banner: bannerPath }
    });

    res.json({ 
      banner: updatedUser.banner,
      message: 'Banner updated successfully' 
    });
  } catch (error) {
    console.error('Error uploading banner:', error);
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

// Get user's posts
router.get('/:id/posts', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// server/routes/user.routes.ts

router.get('/:id/poems', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const poems = await prisma.poem.findMany({
      where: {
        authorId: userId  // Simply use the userId directly here
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
            comments: true,
            likes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(poems);
  } catch (error) {
    console.error('Error fetching user poems:', error);
    res.status(500).json({ error: 'Failed to fetch user poems' });
  }
});

router.get('/:id/manga', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const manga = await prisma.manga.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: true,
        chapters: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            createdAt: true
          }
        }
      }
    });

    res.json(manga);
  } catch (error) {
    console.error('Error fetching user manga:', error);
    res.status(500).json({ error: 'Failed to fetch user manga' });
  }
});

router.get('/:id/lightnovels', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const lightNovels = await prisma.lightNovel.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: true,
        chapters: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            createdAt: true
          }
        }
      }
    });

    res.json(lightNovels);
  } catch (error) {
    console.error('Error fetching user light novels:', error);
    res.status(500).json({ error: 'Failed to fetch user light novels' });
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
            likes: true
          }
        }
      }
    });

    res.json(books);
  } catch (error) {
    console.error('Error fetching user books:', error);
    res.status(500).json({ error: 'Failed to fetch user books' });
  }
});

router.get('/following/poems', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the list of users that the current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);

    // Fetch poems from the followed users
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
    console.error('Error fetching poems from followed users:', error);
    res.status(500).json({ error: 'Failed to fetch poems from followed users' });
  }
});

export default router;