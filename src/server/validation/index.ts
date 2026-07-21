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
    kundliProfileId: postgresUuid.optional(),
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
    text: z.string().trim().max(4000, 'Message is too long').optional().nullable(),
    client_message_id: z.string().uuid('Invalid client message ID'),
    message_type: z.enum(['text', 'image']).optional(),
    attachment_url: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional(),
  }).refine((data) => {
    if (data.message_type === 'image') {
      return !!data.attachment_url;
    }
    return !!data.text && data.text.length > 0;
  }, { message: "Text is required for text messages, and attachment_url is required for images" }),
});
