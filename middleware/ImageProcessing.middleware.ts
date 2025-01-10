// server/middleware/imageProcessing.middleware.ts

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

interface ProcessedImages {
  original: string;
  thumbnail: string;
  optimized: string;
}

export const processImages = async (
  req: Request & { processedImages?: ProcessedImages },
  res: Response,
  next: NextFunction
) => {
  if (!req.file && !req.files) {
    return next();
  }

  try {
    const files = req.files ? Array.isArray(req.files) ? req.files : [req.files] : [req.file];
    const processedImages: ProcessedImages[] = [];

    for (const file of files) {
      if (!file) continue;

      const filename = path.parse(file.filename).name;
      const uploadDir = 'uploads/manga';
      const thumbnailsDir = path.join(uploadDir, 'thumbnails');
      const optimizedDir = path.join(uploadDir, 'optimized');

      // Create directories if they don't exist
      [thumbnailsDir, optimizedDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Generate paths for processed images
      const thumbnailPath = path.join(thumbnailsDir, `${filename}_thumb.webp`);
      const optimizedPath = path.join(optimizedDir, `${filename}_opt.webp`);
      const originalPath = file.path;

      // Process thumbnail (300px width)
      await sharp(originalPath)
        .resize(300, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

      // Process optimized version (max 1200px width)
      await sharp(originalPath)
        .resize(1200, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(optimizedPath);

      processedImages.push({
        original: originalPath,
        thumbnail: thumbnailPath,
        optimized: optimizedPath
      });
    }

    // Attach processed image paths to request object
    req.processedImages = processedImages[0];
    if (processedImages.length > 1) {
      req.processedImages = processedImages;
    }

    next();
  } catch (error) {
    console.error('Image processing error:', error);
    next(error);
  }
};

export const validateImage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : null);

  if (!file) {
    return next();
  }

  // Validate mime type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type. Only JPEG, PNG and WebP images are allowed.'
    });
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return res.status(400).json({
      error: 'File too large. Maximum size is 5MB.'
    });
  }

  next();
};