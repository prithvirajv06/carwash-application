import { z } from 'zod';

const carTypeEnum = z.enum(['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Van']);

export const createCarSchema = z.object({
  body: z.object({
    nickname: z.string().min(1).max(50),
    type: carTypeEnum,
    licensePlate: z
      .string()
      .min(1)
      .max(15)
      .regex(/^[A-Z0-9\s-]+$/, 'Invalid license plate format'),
    parkingLotInfo: z.string().min(1).max(200),
  }),
});

export const updateCarSchema = z.object({
  body: z.object({
    nickname: z.string().min(1).max(50).optional(),
    type: carTypeEnum.optional(),
    parkingLotInfo: z.string().min(1).max(200).optional(),
  }),
});

export type CreateCarInput = z.infer<typeof createCarSchema>['body'];
export type UpdateCarInput = z.infer<typeof updateCarSchema>['body'];
