import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { CampaignStatus, MessageStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d'; // '7d' | '30d' | '90d'

    // Calculate start date
    const now = new Date();
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Parallel aggregate queries
    const [
      totalContacts,
      activeContacts,
      totalCampaigns,
      scheduledCampaigns,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      recentCampaigns,
      allMessagesInRange,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'ACTIVE', optedIn: true, optedOutAt: null } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: CampaignStatus.SCHEDULED } }),
      prisma.message.count({ where: { status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ] } } }),
      prisma.message.count({ where: { status: { in: [MessageStatus.DELIVERED, MessageStatus.READ] } } }),
      prisma.message.count({ where: { status: MessageStatus.READ } }),
      prisma.message.count({ where: { status: MessageStatus.FAILED } }),
      prisma.campaign.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { name: true } },
          _count: { select: { recipients: true } },
        },
      }),
      prisma.message.findMany({
        where: { createdAt: { gte: startDate } },
        select: { status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Calculate rates safely
    const deliveryRate = sentCount > 0 ? Number(((deliveredCount / sentCount) * 100).toFixed(1)) : 0;
    const readRate = deliveredCount > 0 ? Number(((readCount / deliveredCount) * 100).toFixed(1)) : 0;
    const failureRate = (sentCount + failedCount) > 0 ? Number(((failedCount / (sentCount + failedCount)) * 100).toFixed(1)) : 0;

    // Group message timeline by date
    const dailyMap: Record<string, { date: string; sent: number; delivered: number; read: number; failed: number }> = {};

    // Initialize days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      dailyMap[dateKey] = { date: dateKey, sent: 0, delivered: 0, read: 0, failed: 0 };
    }

    allMessagesInRange.forEach((m) => {
      const dateKey = m.createdAt.toISOString().slice(0, 10);
      if (dailyMap[dateKey]) {
        if (m.status === MessageStatus.SENT || m.status === MessageStatus.DELIVERED || m.status === MessageStatus.READ) {
          dailyMap[dateKey].sent++;
        }
        if (m.status === MessageStatus.DELIVERED || m.status === MessageStatus.READ) {
          dailyMap[dateKey].delivered++;
        }
        if (m.status === MessageStatus.READ) {
          dailyMap[dateKey].read++;
        }
        if (m.status === MessageStatus.FAILED) {
          dailyMap[dateKey].failed++;
        }
      }
    });

    const timeSeries = Object.values(dailyMap);

    return NextResponse.json({
      metrics: {
        totalContacts,
        activeContacts,
        totalCampaigns,
        scheduledCampaigns,
        messagesSent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        failed: failedCount,
        rates: {
          deliveryRate,
          readRate,
          failureRate,
        },
      },
      timeSeries,
      recentCampaigns: recentCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        templateName: c.template.name,
        status: c.status,
        totalRecipients: c.totalRecipients,
        sentCount: c.sentCount,
        deliveredCount: c.deliveredCount,
        readCount: c.readCount,
        failedCount: c.failedCount,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
