import Stripe from 'stripe';
import { ProductType } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class StripeService {
  async createPaymentIntent(amount: number, currency: string = 'usd') {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
    });
  }

  async createProduct(title: string, type: ProductType) {
    return await stripe.products.create({
      name: title,
      metadata: {
        type,
      },
    });
  }

  async createPrice(productId: string, amount: number) {
    return await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(amount * 100),
      currency: 'usd',
    });
  }
}