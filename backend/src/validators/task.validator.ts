import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    carId: z.string().min(1),
    employeeId: z.string().min(1),
    subscriptionId: z.string().min(1),
    scheduledDate: z.string().datetime(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    status: z.enum(['Pending', 'InProgress', 'Done', 'Rejected']).optional(),
    adminReview: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const assignTaskSchema = z.object({
  body: z.object({
    employeeId: z.string().min(1),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
