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

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      return NextResponse.json({ error: 'Campaign is already running' }, { status: 400 });
    }

    if (campaign.template.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Cannot start campaign: Template "${campaign.template.name}" is not approved.` },
        { status: 400 }
      );
    }

    await CampaignEngine.prepareCampaign(campaign.id);

    // Run execution in background
    CampaignEngine.executeCampaign(campaign.id).catch((err) => {
      console.error('Execution error:', err);
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CAMPAIGN_STARTED',
        entity: 'Campaign',
        entityId: id,
        metadata: { name: campaign.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign started successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start campaign' }, { status: 500 });
  }
}
