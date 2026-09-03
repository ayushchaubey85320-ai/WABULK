import { describe, it, expect } from 'vitest';
import { buildWhatsAppLink, isValidForWaMe } from '../lib/utils/whatsapp-link';

describe('WhatsApp Click-to-Chat (wa.me) Generator', () => {
  it('should generate valid wa.me link without leading +', () => {
    const link = buildWhatsAppLink('+919876543210');
    expect(link).toBe('https://wa.me/919876543210');
  });

  it('should encode URL parameters properly with spaces and special characters', () => {
    const link = buildWhatsAppLink('+919876543210', 'Hello Rahul! How are you?');
    expect(link).toBe('https://wa.me/919876543210?text=Hello%20Rahul!%20How%20are%20you%3F');
  });

  it('should strip dashes, brackets and spaces from phone number', () => {
    const link = buildWhatsAppLink('+1 (415) 555-2671', 'Test message');
    expect(link).toBe('https://wa.me/14155552671?text=Test%20message');
  });

  it('should validate phone numbers properly', () => {
    expect(isValidForWaMe('+919876543210')).toBe(true);
    expect(isValidForWaMe('123')).toBe(false);
  });
});
