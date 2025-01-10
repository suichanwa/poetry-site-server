import prisma from '../lib/prisma';
import { StripeService } from './stripe.service';

const PLATFORM_FEE_PERCENTAGE = 0.1; // 10% platform fee

export class DigitalProductService {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  async createProduct(data: {
    title: string;
    description: string;
    price: number;
    type: ProductType;
    authorId: number;
    coverImage?: string;
  }) {
    const stripeProduct = await this.stripeService.createProduct(data.title, data.type);
    const stripePrice = await this.stripeService.createPrice(stripeProduct.id, data.price);

    return await prisma.digitalProduct.create({
      data: {
        ...data,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
      }
    });
  }

  async processSale(productId: number, buyerId: number) {
    const product = await prisma.digitalProduct.findUnique({
      where: { id: productId }
    });

    if (!product) throw new Error('Product not found');

    const commission = product.price * PLATFORM_FEE_PERCENTAGE;
    const paymentIntent = await this.stripeService.createPaymentIntent(product.price);

    return await prisma.sale.create({
      data: {
        productId,
        buyerId,
        amount: product.price,
        commission,
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
      }
    });
  }
}