import { z } from 'zod';

export const rechargeSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be greater than zero'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    referenceType: z.enum(['recharge', 'consultation', 'refund', 'bonus']).default('recharge'),
    referenceId: z.string().uuid('Invalid UUID for referenceId').optional(),
    idempotencyKey: z.string().min(1, 'Idempotency key is required to prevent duplicate requests'),
  }),
});

export const createConsultationSchema = z.object({
  body: z.object({
    astrologerId: z.string().uuid('Invalid astrologer ID'),
    ratePerMinute: z.number().positive('Rate must be positive'),
  }),
});

export const consultationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid consultation session ID'),
  }),
});
