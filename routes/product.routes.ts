import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import multer from 'multer';
import path from 'path';

const router = Router();
const upload = multer({
  dest: 'uploads/products',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const products = await prisma.digitalProduct.findMany({
      where: type ? { type: type as string } : undefined,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create new product
router.post('/', authMiddleware, upload.single('coverImage'), async (req: any, res) => {
  try {
    const { title, description, price, type } = req.body;
    const coverImage = req.file ? `/uploads/products/${req.file.filename}` : null;

    const product = await prisma.digitalProduct.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        type,
        coverImage,
        authorId: req.user.id,
      },
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;