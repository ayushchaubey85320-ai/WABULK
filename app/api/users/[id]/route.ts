import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(['SUPER_ADMIN']);
    const { id } = await params;
    const body = await request.json();

    const { role, status } = body;

    // Prevent self demotion or deactivation
    if (currentUser.id === id && (status === 'INACTIVE' || (role && role !== 'SUPER_ADMIN'))) {
      return NextResponse.json({ error: 'Cannot deactivate or demote your own account' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(status && { status }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: id,
        metadata: { role, status },
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(['SUPER_ADMIN']);
    const { id } = await params;

    if (currentUser.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
