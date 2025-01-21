import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
}

export const verifyToken = async (token: string) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key') as { userId: number };
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { 
      id: true, 
      name: true, 
      email: true,
      avatar: true,
      bio: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};