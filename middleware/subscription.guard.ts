import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export const requirePremium = async (req: any, res: Response, next: NextFunction) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id }
    });

    if (!subscription || subscription.tier !== 'PREMIUM' || subscription.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Premium subscription required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};