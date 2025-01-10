// server/routes/lightNovel.routes.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware.js'; // Fix import path
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; 
import { 
  AuthRequest, 
  LightNovelCreateData,
  LightNovelResponse 
} from '../types/lightNovel.types';

const router = express.Router();
const prisma = new PrismaClient();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In the multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads/novels/covers');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `coverImage-${uniqueSuffix}${ext}`);
  }
});

// In your POST route handler, convert the full path to a relative

const uploadCover = multer({ 
  storage,
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

router.post('/', 
  authMiddleware, 
  uploadCover.single('coverFile'), 
  async (req: AuthRequest, res) => {
    try {
      const { title, description, tags } = req.body;
      const parsedTags = JSON.parse(tags || '[]');

      if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      if (!description?.trim()) {
        return res.status(400).json({ error: 'Description is required' });
      }

      // Create relative path for storage
      const relativePath = req.file 
        ? `/uploads/novels/covers/${path.basename(req.file.path)}`
        : null;

      const novelData: LightNovelCreateData = {
        title: title.trim(),
        description: description.trim(),
        coverImage: relativePath, // Store relative path instead of full path
        authorId: req.user.id,
        tags: parsedTags
      };

      const lightNovel = await prisma.lightNovel.create({
        data: {
          ...novelData,
          tags: {
            connectOrCreate: novelData.tags.map(tag => ({
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
          chapters: true
        }
      });

      res.status(201).json({
        success: true,
        data: lightNovel,
        message: 'Light novel created successfully'
      });
    } catch (error) {
      console.error('Error creating light novel:', error);
      res.status(500).json({ 
        error: 'Failed to create light novel',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
});

// Get all light novels
router.get('/', async (req, res) => {
  try {
    const novels = await prisma.lightNovel.findMany({
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
        chapters: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(novels);
  } catch (error) {
    console.error('Error fetching light novels:', error);
    res.status(500).json({ error: 'Failed to fetch light novels' });
  }
});

// Get single light novel by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const novel = await prisma.lightNovel.findUnique({
      where: { id: parseInt(id) },
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
        chapters: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Light novel not found' });
    }

    res.json(novel);
  } catch (error) {
    console.error('Error fetching light novel:', error);
    res.status(500).json({ error: 'Failed to fetch light novel' });
  }
});

// Update light novel
router.put('/:id', authMiddleware, uploadCover.single('coverFile'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;
    const parsedTags = JSON.parse(tags || '[]');

    // Check ownership
    const novel = await prisma.lightNovel.findUnique({
      where: { id: parseInt(id) }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Light novel not found' });
    }

    if (novel.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedNovel = await prisma.lightNovel.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        ...(req.file && { coverImage: req.file.path }),
        tags: {
          set: [],
          connectOrCreate: parsedTags.map((tag: string) => ({
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
        chapters: true
      }
    });

    res.json(updatedNovel);
  } catch (error) {
    console.error('Error updating light novel:', error);
    res.status(500).json({ error: 'Failed to update light novel' });
  }
});

// Delete light novel
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const novel = await prisma.lightNovel.findUnique({
      where: { id: parseInt(id) }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Light novel not found' });
    }

    if (novel.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.lightNovel.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Light novel deleted successfully' });
  } catch (error) {
    console.error('Error deleting light novel:', error);
    res.status(500).json({ error: 'Failed to delete light novel' });
  }
});

// Chapter endpoints

// Create new chapter
router.post('/:id/chapters', authMiddleware, async (req: any, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const { title, content, orderIndex } = req.body;

    // Check novel ownership
    const novel = await prisma.lightNovel.findUnique({
      where: { id: novelId }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Light novel not found' });
    }

    if (novel.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const chapter = await prisma.lightNovelChapter.create({
      data: {
        title,
        content,
        orderIndex: parseInt(orderIndex),
        lightNovelId: novelId
      }
    });

    res.json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// Get all chapters of a light novel
router.get('/:id/chapters', async (req, res) => {
  try {
    const novelId = parseInt(req.params.id);

    const chapters = await prisma.lightNovelChapter.findMany({
      where: { lightNovelId: novelId },
      orderBy: {
        orderIndex: 'asc'
      }
    });

    res.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// Update chapter
router.put('/:id/chapters/:chapterId', authMiddleware, async (req: any, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const chapterId = parseInt(req.params.chapterId);
    const { title, content, orderIndex } = req.body;

    // Check novel ownership
    const novel = await prisma.lightNovel.findUnique({
      where: { id: novelId }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Light novel not found' });
    }

    if (novel.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const chapter = await prisma.lightNovelChapter.update({
      where: { id: chapterId },
      data: {
        title,
        content,
        orderIndex: parseInt(orderIndex)
      }
    });

    res.json(chapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// Delete chapter
router.delete('/:id/chapters/:chapterId', authMiddleware, async (req: any, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const chapterId = parseInt(req.params.chapterId);

    // Check novel ownership
    const novel = await prisma.lightNovel.findUnique({
      where: { id: novelId }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Light novel not found' });
    }

    if (novel.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.lightNovelChapter.delete({
      where: { id: chapterId }
    });

    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

export default router;