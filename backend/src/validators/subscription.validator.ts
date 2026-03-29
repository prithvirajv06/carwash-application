import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  body: z.object({
    carId: z.string().min(1, 'Car ID is required'),
    planId: z.string().min(1, 'Plan ID is required'),
  }),
});

export const renewSubscriptionSchema = z.object({
  body: z.object({
    planId: z.string().min(1, 'Plan ID is required').optional(),
  }),
});

export const createPaymentOrderSchema = z.object({
  body: z.object({
    subscriptionId: z.string().min(1, 'Subscription ID is required'),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
    subscriptionId: z.string().min(1),
  }),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>['body'];
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>['body'];
