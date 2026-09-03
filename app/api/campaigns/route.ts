import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { CampaignCreateSchema } from '@/lib/validation/schemas';
import { CampaignEngine } from '@/lib/queue/campaign-engine';
import { CampaignStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const tab = searchParams.get('tab'); // 'scheduled' | 'all'

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (tab === 'scheduled') {
      where.status = CampaignStatus.SCHEDULED;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: { name: true, category: true, language: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parseRes = CampaignCreateSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseRes.error.flatten() }, { status: 400 });
    }

    const { name, description, templateId, audienceType, audienceFilter, variableMapping, scheduledAt, sendNow } = parseRes.data;

    // Verify template exists and is approved
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: 'Selected message template not found' }, { status: 404 });
    }
    if (template.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Campaign cannot be created with a template that is not approved by Meta' },
        { status: 400 }
      );
    }

    // Estimate eligible contacts
    const eligible = await CampaignEngine.getEligibleContacts(audienceType as any, audienceFilter);
    if (eligible.length === 0) {
      return NextResponse.json(
        { error: 'No active, opted-in contacts found matching the selected audience criteria' },
        { status: 400 }
      );
    }

    const initialStatus = scheduledAt && !sendNow
      ? CampaignStatus.SCHEDULED
      : CampaignStatus.DRAFT;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description: description || null,
        status: initialStatus,
        templateId,
        audienceType: audienceType as any,
        audienceFilter: audienceFilter || {},
        variableMapping: variableMapping || {},
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        totalRecipients: eligible.length,
        createdById: user.id,
      },
      include: {
        template: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CAMPAIGN_CREATED',
        entity: 'Campaign',
        entityId: campaign.id,
        metadata: { name: campaign.name, audienceCount: eligible.length, sendNow },
      },
    });

    // If sendNow is true, prepare and trigger execution in background
    if (sendNow) {
      await CampaignEngine.prepareCampaign(campaign.id);
      // Asynchronously trigger execution without blocking the response
      CampaignEngine.executeCampaign(campaign.id).catch((err) => {
        console.error('Error executing campaign background engine:', err);
      });
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    console.error('Campaign creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 500 });
  }
}
