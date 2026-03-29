import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID as string,
  key_secret: process.env.RAZORPAY_SECRET as string,
});

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
}

export const createOrder = async (
  amount: number,
  currency: string = 'INR',
  receipt: string
): Promise<RazorpayOrder> => {
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt,
    payment_capture: true,
  });

  logger.info(`Razorpay order created: ${order.id}`);
  return order as unknown as RazorpayOrder;
};

export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET as string)
    .update(body)
    .digest('hex');

  return expectedSignature === razorpaySignature;
};

export const fetchPaymentDetails = async (paymentId: string) => {
  return razorpay.payments.fetch(paymentId);
};

export const initiateRefund = async (paymentId: string, amount?: number) => {
  const params: { amount?: number } = {};
  if (amount) params.amount = Math.round(amount * 100);
  return razorpay.payments.refund(paymentId, params);
};
