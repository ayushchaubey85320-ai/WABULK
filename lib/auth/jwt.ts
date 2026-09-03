import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.AUTH_SECRET || 'wabulk_default_secure_secret_key_development_2026';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'wabulk_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  originalAdminId?: string;
  isImpersonating?: boolean;
}

export function signToken(payload: TokenPayload, rememberMe: boolean = false): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: rememberMe ? '30d' : '24h',
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return {
      ...user,
      isImpersonating: !!decoded.isImpersonating,
      originalAdminId: decoded.originalAdminId,
    };
  } catch (err) {
    return null;
  }
}

export async function requireAuth(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      throw new Error('FORBIDDEN');
    }
  }

  return user;
}
