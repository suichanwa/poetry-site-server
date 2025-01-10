import { Router } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

async function handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
  const userId = parseInt(stripeSubscription.metadata.userId);
  
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: stripeSubscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
      endDate: new Date(stripeSubscription.current_period_end * 1000)
    }
  });
}

export default router;