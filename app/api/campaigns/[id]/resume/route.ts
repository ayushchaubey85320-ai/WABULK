import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { CampaignEngine } from '@/lib/queue/campaign-engine';
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

    if (campaign.status !== CampaignStatus.PAUSED) {
      return NextResponse.json({ error: 'Only paused campaigns can be resumed' }, { status: 400 });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.RUNNING },
    });

    CampaignEngine.executeCampaign(campaign.id).catch((err) => {
      console.error('Resume execution error:', err);
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CAMPAIGN_RESUMED',
        entity: 'Campaign',
        entityId: id,
        metadata: { name: campaign.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign resumed' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to resume campaign' }, { status: 500 });
  }
}
