import { describe, it, expect } from 'vitest';
import { interpolateTemplate, extractPlaceholders } from '../lib/utils/interpolation';

describe('Template Interpolation Engine', () => {
  it('should extract numbered placeholders {{1}}, {{2}}', () => {
    const text = 'Hello {{1}}, your order {{2}} is confirmed for {{3}}!';
    const placeholders = extractPlaceholders(text);
    expect(placeholders).toEqual(['1', '2', '3']);
  });

  it('should replace mapped variables with recipient data', () => {
    const template = 'Hello {{1}}, appointment is at {{2}}';
    const mapping = { '1': 'firstName', '2': 'Tomorrow 10 AM' };
    const recipient = { firstName: 'Rahul', phone: '+919876543210' };

    const result = interpolateTemplate(template, mapping, recipient);
    expect(result).toBe('Hello Rahul, appointment is at Tomorrow 10 AM');
  });

  it('should support direct named variables like {{firstName}}', () => {
    const template = 'Greetings {{firstName}} {{lastName}}, welcome to WABulk!';
    const recipient = { firstName: 'Priya', lastName: 'Singh' };

    const result = interpolateTemplate(template, {}, recipient);
    expect(result).toBe('Greetings Priya Singh, welcome to WABulk!');
  });
});
