import { z } from 'zod';

const postgresUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID format',
);

export const createConsultationSchema = z.object({
  body: z.object({
    // PostgreSQL accepts UUID values independently of RFC version/variant
    // bits. Existing seeded astrologer IDs use that canonical DB format.
    astrologerId: postgresUuid,
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
