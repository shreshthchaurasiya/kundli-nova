// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createConsultationSchema } from '../validation';

describe('Validation Schemas', () => {
  it('validates an astrologer UUID without requiring a client rate', () => {
    const validData = {
      body: {
        astrologerId: '33333333-3333-4333-8333-333333333333',
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
