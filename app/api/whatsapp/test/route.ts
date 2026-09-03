import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { WhatsAppService } from '@/lib/whatsapp/whatsapp.service';

export async function POST() {
  try {
    const user = await requireAuth(['SUPER_ADMIN', 'ADMIN']);

    const result = await WhatsAppService.validateConfiguration();

    // Store test outcome in DB
    const config = await prisma.whatsAppConfig.findFirst();
    if (config) {
      await prisma.whatsAppConfig.update({
        where: { id: config.id },
        data: {
          lastTestedAt: new Date(),
          testStatus: result.status,
          testMessage: result.message,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'WHATSAPP_TEST_CONNECTION',
        entity: 'WhatsAppConfig',
        metadata: { status: result.status, message: result.message },
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, status: 'ERROR', message: error.message || 'Testing connection failed' },
      { status: 500 }
    );
  }
}
