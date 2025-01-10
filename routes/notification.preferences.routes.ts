import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

const router = express.Router();

const preferencesSchema = z.object({
  emailLikes: z.boolean().optional(),
  emailComments: z.boolean().optional(),
  emailFollows: z.boolean().optional(),
  pushLikes: z.boolean().optional(),
  pushComments: z.boolean().optional(),
  pushFollows: z.boolean().optional()
});

router.get('/preferences', authMiddleware, async (req: any, res) => {
  try {
    const preferences = await notificationService.getNotificationPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

router.put('/preferences', authMiddleware, async (req: any, res) => {
  try {
    const preferences = preferencesSchema.parse(req.body);
    const updatedPreferences = await notificationService.updateNotificationPreferences(
      req.user.id,
      preferences
    );
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

export default router;