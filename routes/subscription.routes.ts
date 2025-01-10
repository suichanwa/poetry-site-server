import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { SubscriptionService } from '../services/subscription.service';

const router = Router();
const subscriptionService = new SubscriptionService();

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { billingPeriod } = req.body;
    const subscription = await subscriptionService.createSubscription(
      req.user.id,
      billingPeriod
    );
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const subscription = await subscriptionService.cancelSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;