import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser, signToken } from '@/lib/auth/jwt';

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.isImpersonating || !currentUser.originalAdminId) {
      return NextResponse.json({ error: 'You are not currently impersonating another user' }, { status: 400 });
    }

    const superAdmin = await prisma.user.findUnique({
      where: { id: currentUser.originalAdminId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!superAdmin) {
      return NextResponse.json({ error: 'Original admin account not found' }, { status: 404 });
    }

    const token = signToken({
      userId: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role,
    });

    const cookieName = process.env.AUTH_COOKIE_NAME || 'wabulk_session';
    const response = NextResponse.json({
      success: true,
      user: superAdmin,
      message: 'Successfully returned to Super Admin account',
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
        userId: superAdmin.id,
        userEmail: superAdmin.email,
        action: 'SUPER_ADMIN_SWITCH_BACK',
        entity: 'User',
        entityId: superAdmin.id,
      },
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to switch back' }, { status: 500 });
  }
}
