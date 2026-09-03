import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { TagSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    await requireAuth();
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return NextResponse.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        contactCount: t._count.contacts,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parseRes = TagSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseRes.error.flatten() }, { status: 400 });
    }

    const { name, color } = parseRes.data;

    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: { name, color },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'TAG_CREATED',
        entity: 'Tag',
        entityId: tag.id,
        metadata: { name: tag.name },
      },
    });

    return NextResponse.json({ success: true, tag });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create tag' }, { status: 500 });
  }
}
