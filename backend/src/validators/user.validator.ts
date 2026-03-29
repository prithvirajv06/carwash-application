import { z } from 'zod';

export const createAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(15),
    role: z.enum(['admin', 'employee']),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(10).max(15).optional(),
    apartmentId: z.string().optional(),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
  }),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
