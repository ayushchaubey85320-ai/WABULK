import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { CampaignStatus, MessageStatus } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.CANCELLED) {
      return NextResponse.json({ error: 'Campaign cannot be cancelled in its current state' }, { status: 400 });
    }

    // Cancel remaining queued recipients
    await prisma.campaignRecipient.updateMany({
      where: { campaignId: id, status: MessageStatus.QUEUED },
      data: { status: MessageStatus.SKIPPED, errorMessage: 'Campaign cancelled by operator' },
    });

    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CAMPAIGN_CANCELLED',
        entity: 'Campaign',
        entityId: id,
        metadata: { name: campaign.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign cancelled' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to cancel campaign' }, { status: 500 });
  }
}
