import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { toPhone: { contains: search, mode: 'insensitive' } },
        { whatsappMessageId: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { contact: { firstName: { contains: search, mode: 'insensitive' } } },
        { contact: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { id: true, name: true } },
          contact: { select: { firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        recipientName: `${m.contact.firstName} ${m.contact.lastName || ''}`.trim(),
        phone: m.toPhone,
        campaignId: m.campaign?.id,
        campaignName: m.campaign?.name || 'Direct / System',
        templateName: m.templateName,
        status: m.status,
        whatsappMessageId: m.whatsappMessageId,
        body: m.body,
        errorMessage: m.errorMessage,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
