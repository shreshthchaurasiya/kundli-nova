// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { rechargeSchema } from '../validation';

describe('Validation Schemas', () => {
  it('validates correct recharge payload', () => {
    const validData = {
      body: {
        amount: 100,
        title: 'Recharge',
        idempotencyKey: 'key-123'
      }
    };
    expect(rechargeSchema.parse(validData)).toBeDefined();
  });

  it('rejects negative amount', () => {
    const invalidData = {
      body: {
        amount: -50,
        title: 'Recharge',
        idempotencyKey: 'key-123'
      }
    };
    expect(() => rechargeSchema.parse(invalidData)).toThrow();
  });
});
