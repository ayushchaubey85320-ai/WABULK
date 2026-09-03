import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { CampaignStatus } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    if (campaign.status !== CampaignStatus.RUNNING) {
      return NextResponse.json({ error: 'Only running campaigns can be paused' }, { status: 400 });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CAMPAIGN_PAUSED',
        entity: 'Campaign',
        entityId: id,
        metadata: { name: campaign.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign paused' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to pause campaign' }, { status: 500 });
  }
}
