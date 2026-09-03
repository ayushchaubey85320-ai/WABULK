import { describe, it, expect } from 'vitest';
import { validateAndFormatPhone } from '../lib/utils/phone';

describe('Phone Number E.164 Validation', () => {
  it('should accept valid international number with country code', () => {
    const res = validateAndFormatPhone('+919876543210');
    expect(res.isValid).toBe(true);
    expect(res.formatted).toBe('+919876543210');
  });

  it('should format 10-digit Indian phone with default +91 prefix', () => {
    const res = validateAndFormatPhone('9876543210', 'IN');
    expect(res.isValid).toBe(true);
    expect(res.formatted).toBe('+919876543210');
  });

  it('should clean spaces, dashes, and parentheses', () => {
    const res = validateAndFormatPhone('+91 98765-43210');
    expect(res.isValid).toBe(true);
    expect(res.formatted).toBe('+919876543210');
  });

  it('should reject invalid or too short phone numbers', () => {
    const res = validateAndFormatPhone('12345');
    expect(res.isValid).toBe(false);
  });

  it('should reject empty input', () => {
    const res = validateAndFormatPhone('');
    expect(res.isValid).toBe(false);
  });
});
