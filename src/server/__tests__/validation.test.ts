// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createConsultationSchema } from '../validation';

describe('Validation Schemas', () => {
  it('validates the persisted PostgreSQL astrologer UUID without requiring a client rate', () => {
    const validData = {
      body: {
        astrologerId: '11111111-1111-1111-1111-111111111111',
      }
    };
    expect(createConsultationSchema.parse(validData)).toBeDefined();
  });

  it('rejects a non-UUID astrologer identifier', () => {
    const invalidData = {
      body: {
        astrologerId: '1',
      }
    };
    expect(() => createConsultationSchema.parse(invalidData)).toThrow();
  });
});
