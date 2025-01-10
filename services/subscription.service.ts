import prisma from '../lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const SUBSCRIPTION_PRICES = {
  MONTHLY: 30,
  QUARTERLY: 75,
  SEMI_ANNUAL: 110,
  ANNUAL: 200
};

export class SubscriptionService {
  async createSubscription(userId: number, billingPeriod: BillingPeriod) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user) throw new Error('User not found');

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id.toString() }
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: SUBSCRIPTION_PRICES[billingPeriod].toString() }],
      metadata: { userId: user.id.toString() }
    });

    // Create subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        tier: 'PREMIUM',
        billingPeriod,
        price: SUBSCRIPTION_PRICES[billingPeriod],
        endDate: new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscriptionId: stripeSubscription.id,
        status: 'ACTIVE'
      }
    });

    return subscription;
  }

  async cancelSubscription(userId: number) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) throw new Error('Subscription not found');

    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    return await prisma.subscription.update({
      where: { userId },
      data: { status: 'CANCELLED' }
    });
  }
}