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

export const consultationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid consultation session ID'),
  }),
});

export const consultationMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid consultation session ID'),
  }),
  body: z.object({
    text: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
    client_message_id: z.string().uuid('Invalid client message ID'),
  }),
});
