import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { GroupSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    await requireAuth();
    const groups = await prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        createdAt: g.createdAt,
        contactCount: g._count.contacts,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parseRes = GroupSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseRes.error.flatten() }, { status: 400 });
    }

    const { name, description } = parseRes.data;

    const existing = await prisma.group.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
    }

    const group = await prisma.group.create({
      data: { name, description: description || null },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'GROUP_CREATED',
        entity: 'Group',
        entityId: group.id,
        metadata: { name: group.name },
      },
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create group' }, { status: 500 });
  }
}
