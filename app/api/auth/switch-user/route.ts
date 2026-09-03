import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser, signToken } from '@/lib/auth/jwt';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN (or an impersonating admin) can switch users
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    const hasAdminOrigin = !!currentUser.originalAdminId;

    if (!isSuperAdmin && !hasAdminOrigin) {
      return NextResponse.json({ error: 'Only Super Admin can switch users' }, { status: 403 });
    }

    const { targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Cannot switch to an inactive user' }, { status: 400 });
    }

    const originalAdminId = currentUser.originalAdminId || currentUser.id;

    const token = signToken({
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      originalAdminId,
      isImpersonating: true,
    });

    const cookieName = process.env.AUTH_COOKIE_NAME || 'wabulk_session';
    const response = NextResponse.json({
      success: true,
      user: {
        ...targetUser,
        isImpersonating: true,
      },
    });

    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    await prisma.auditLog.create({
      data: {
        userId: originalAdminId,
        userEmail: currentUser.email,
        action: 'SUPER_ADMIN_SWITCH_USER',
        entity: 'User',
        entityId: targetUser.id,
        metadata: {
          impersonatedUser: targetUser.email,
          impersonatedRole: targetUser.role,
        },
      },
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to switch user' }, { status: 500 });
  }
}
