import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const where: any = { campaignId: id };
    if (status) {
      where.status = status;
    }

    const [recipients, total] = await Promise.all([
      prisma.campaignRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          contact: {
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
          message: {
            select: { whatsappMessageId: true, errorMessage: true },
          },
        },
      }),
      prisma.campaignRecipient.count({ where }),
    ]);

    return NextResponse.json({
      recipients: recipients.map((r) => ({
        id: r.id,
        status: r.status,
        name: `${r.contact.firstName} ${r.contact.lastName || ''}`.trim(),
        phone: r.contact.phone,
        email: r.contact.email,
        personalizedBody: r.personalizedBody,
        whatsappMessageId: r.message?.whatsappMessageId,
        errorMessage: r.errorMessage || r.message?.errorMessage,
        sentAt: r.sentAt,
        deliveredAt: r.deliveredAt,
        readAt: r.readAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaign recipients' }, { status: 500 });
  }
}
