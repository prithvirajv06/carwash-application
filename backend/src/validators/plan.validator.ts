import { z } from 'zod';

const priceMatrixSchema = z.object({
  carType: z.enum(['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Van']),
  apartmentId: z.string().min(1, 'Apartment ID is required'),
  price: z.number().min(0, 'Price must be non-negative'),
});

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    priceMatrix: z.array(priceMatrixSchema).min(1, 'At least one price entry required'),
    attributes: z.array(z.string()).default([]),
    durationDays: z.number().int().min(1),
  }),
});

export const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    priceMatrix: z.array(priceMatrixSchema).optional(),
    attributes: z.array(z.string()).optional(),
    durationDays: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>['body'];
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>['body'];
