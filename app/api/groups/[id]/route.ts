import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { GroupSchema } from '@/lib/validation/schemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const parseRes = GroupSchema.partial().safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseRes.error.flatten() }, { status: 400 });
    }

    const { name, description } = parseRes.data;

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'GROUP_UPDATED',
        entity: 'Group',
        entityId: id,
        metadata: { name: group.name },
      },
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    await prisma.group.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'GROUP_DELETED',
        entity: 'Group',
        entityId: id,
        metadata: { name: group.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Group deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
