import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { ContactSchema } from '@/lib/validation/schemas';
import { validateAndFormatPhone } from '@/lib/utils/phone';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const search = searchParams.get('search')?.trim();
    const groupId = searchParams.get('groupId');
    const tagId = searchParams.get('tagId');
    const status = searchParams.get('status');
    const optedIn = searchParams.get('optedIn');

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (groupId) {
      where.groups = {
        some: { groupId },
      };
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    if (status) {
      where.status = status;
    }

    if (optedIn !== null && optedIn !== undefined && optedIn !== '') {
      where.optedIn = optedIn === 'true';
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          groups: { include: { group: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      contacts: contacts.map((c) => ({
        ...c,
        groups: c.groups.map((g) => g.group),
        tags: c.tags.map((t) => t.tag),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parseRes = ContactSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseRes.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, phone, email, country, status, optedIn, groupIds, tagIds } = parseRes.data;

    // Validate and format phone to E.164
    const phoneRes = validateAndFormatPhone(phone, country || 'IN');
    if (!phoneRes.isValid) {
      return NextResponse.json(
        { error: phoneRes.error || 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Check duplicate phone
    const existing = await prisma.contact.findUnique({
      where: { phone: phoneRes.formatted },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Contact with phone number ${phoneRes.formatted} already exists` },
        { status: 409 }
      );
    }

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName: lastName || null,
        phone: phoneRes.formatted,
        email: email || null,
        country: country || 'IN',
        status: status as any,
        optedIn,
        optedOutAt: optedIn ? null : new Date(),
        groups: {
          create: (groupIds || []).map((gid) => ({ groupId: gid })),
        },
        tags: {
          create: (tagIds || []).map((tid) => ({ tagId: tid })),
        },
      },
      include: {
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CONTACT_CREATED',
        entity: 'Contact',
        entityId: contact.id,
        metadata: { phone: contact.phone, name: `${firstName} ${lastName || ''}`.trim() },
      },
    });

    return NextResponse.json({
      success: true,
      contact: {
        ...contact,
        groups: contact.groups.map((g) => g.group),
        tags: contact.tags.map((t) => t.tag),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create contact' }, { status: 500 });
  }
}
