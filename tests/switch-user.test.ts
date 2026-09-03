import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../lib/auth/jwt';
import { Role } from '@prisma/client';

describe('Super Admin User Switching (Impersonation)', () => {
  it('should encode originalAdminId and isImpersonating in token', () => {
    const originalAdminId = 'super-admin-uuid-1';
    const targetUserId = 'operator-uuid-2';

    const token = signToken({
      userId: targetUserId,
      email: 'operator@example.com',
      name: 'Test Operator',
      role: Role.OPERATOR,
      originalAdminId,
      isImpersonating: true,
    });

    const decoded = verifyToken(token);
    expect(decoded?.userId).toBe(targetUserId);
    expect(decoded?.role).toBe(Role.OPERATOR);
    expect(decoded?.isImpersonating).toBe(true);
    expect(decoded?.originalAdminId).toBe(originalAdminId);
  });

  it('should restore normal token when switching back', () => {
    const originalAdminId = 'super-admin-uuid-1';

    const restoredToken = signToken({
      userId: originalAdminId,
      email: 'admin@example.com',
      name: 'System Super Admin',
      role: Role.SUPER_ADMIN,
    });

    const decoded = verifyToken(restoredToken);
    expect(decoded?.userId).toBe(originalAdminId);
    expect(decoded?.role).toBe(Role.SUPER_ADMIN);
    expect(decoded?.isImpersonating).toBeFalsy();
  });
});
