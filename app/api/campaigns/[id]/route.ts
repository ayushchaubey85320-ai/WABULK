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

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        createdBy: {
          select: { name: true, email: true },
        },
        _count: {
          select: { recipients: true, messages: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Calculate rates safely (avoid dividing by zero)
    const deliveryRate = campaign.sentCount > 0
      ? Number(((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1))
      : 0;

    const readRate = campaign.deliveredCount > 0
      ? Number(((campaign.readCount / campaign.deliveredCount) * 100).toFixed(1))
      : 0;

    const failureRate = campaign.totalRecipients > 0
      ? Number(((campaign.failedCount / campaign.totalRecipients) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      campaign: {
        ...campaign,
        rates: {
          deliveryRate,
          readRate,
          failureRate,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaign details' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    if (campaign.status === 'RUNNING') {
      return NextResponse.json(
        { error: 'Cannot delete a campaign while it is currently running. Please cancel or pause it first.' },
        { status: 400 }
      );
    }

    await prisma.campaign.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CAMPAIGN_DELETED',
        entity: 'Campaign',
        entityId: id,
        metadata: { name: campaign.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
