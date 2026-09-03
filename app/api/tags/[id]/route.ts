import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });

    await prisma.tag.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'TAG_DELETED',
        entity: 'Tag',
        entityId: id,
        metadata: { name: tag.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
