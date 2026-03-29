import { z } from 'zod';

export const createDropdownSchema = z.object({
  body: z.object({
    label: z.string().min(1).max(100),
    value: z.string().min(1).max(100),
    category: z.string().min(1).max(50),
    parentId: z.string().optional().nullable(),
    sortOrder: z.number().int().min(0).default(0),
  }),
});

export const updateDropdownSchema = z.object({
  body: z.object({
    label: z.string().min(1).max(100).optional(),
    value: z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export type CreateDropdownInput = z.infer<typeof createDropdownSchema>['body'];
export type UpdateDropdownInput = z.infer<typeof updateDropdownSchema>['body'];
