import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../lib/auth/jwt';
import { Role } from '@prisma/client';

describe('Authentication & Security Logic', () => {
  it('should hash and compare passwords correctly', async () => {
    const raw = 'SecurePassword@123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(raw, salt);

    expect(await bcrypt.compare(raw, hash)).toBe(true);
    expect(await bcrypt.compare('WrongPassword', hash)).toBe(false);
  });

  it('should sign and verify JWT tokens', () => {
    const payload = {
      userId: 'test-user-id-123',
      email: 'tester@example.com',
      role: Role.ADMIN,
      name: 'Tester',
    };

    const token = signToken(payload);
    expect(token).toBeTruthy();

    const decoded = verifyToken(token);
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });
});
