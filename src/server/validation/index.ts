import { z } from 'zod';

export const createConsultationSchema = z.object({
  body: z.object({
    astrologerId: z.string().uuid('Invalid astrologer ID'),
  }),
});

export const consultationTransitionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid consultation session ID'),
  }),
  body: z.object({
    targetStatus: z.enum(['ACTIVE', 'REJECTED', 'EXPIRED']),
  }),
});

export const consultationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid consultation session ID'),
  }),
});
