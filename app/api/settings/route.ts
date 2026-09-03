import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { WhatsAppService } from '@/lib/whatsapp/whatsapp.service';

export async function GET() {
  try {
    await requireAuth();

    // Get all system settings
    const rawSettings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    rawSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Get WhatsApp configuration (never return full access token)
    const waConfig = await prisma.whatsAppConfig.findFirst();
    const isLiveConfigured = await WhatsAppService.isConfigured();

    const maskedToken = waConfig?.accessTokenEncrypted
      ? `••••••••••••${waConfig.accessTokenEncrypted.slice(-4)}`
      : process.env.WHATSAPP_ACCESS_TOKEN
      ? `••••••••••••${process.env.WHATSAPP_ACCESS_TOKEN.slice(-4)}`
      : '';

    return NextResponse.json({
      settings: {
        orgName: settingsMap['ORG_NAME'] || 'WABulk Technologies',
        defaultTimezone: settingsMap['DEFAULT_TIMEZONE'] || 'Asia/Kolkata',
        defaultCountry: settingsMap['DEFAULT_COUNTRY'] || 'IN',
        messagesPerMinute: parseInt(settingsMap['MESSAGES_PER_MINUTE'] || '60'),
        maxConcurrentJobs: parseInt(settingsMap['MAX_CONCURRENT_JOBS'] || '5'),
        retryLimit: parseInt(settingsMap['RETRY_LIMIT'] || '3'),
        demoMode: settingsMap['DEMO_MODE'] !== 'false',
      },
      whatsapp: {
        isConfigured: isLiveConfigured,
        businessAccountId: waConfig?.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        phoneNumberId: waConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        apiVersion: waConfig?.apiVersion || process.env.WHATSAPP_API_VERSION || 'v20.0',
        maskedToken,
        verifyToken: waConfig?.verifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'wabulk_meta_webhook_verify_secret_token_123',
        lastTestedAt: waConfig?.lastTestedAt,
        testStatus: waConfig?.testStatus || (isLiveConfigured ? 'CONNECTED' : 'DEMO'),
        testMessage: waConfig?.testMessage,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(['SUPER_ADMIN', 'ADMIN']);
    const body = await request.json();

    const { general, messaging, whatsapp } = body;

    // Update General Settings
    if (general) {
      if (general.orgName) {
        await prisma.systemSetting.upsert({
          where: { key: 'ORG_NAME' },
          update: { value: general.orgName },
          create: { key: 'ORG_NAME', value: general.orgName },
        });
      }
      if (general.defaultTimezone) {
        await prisma.systemSetting.upsert({
          where: { key: 'DEFAULT_TIMEZONE' },
          update: { value: general.defaultTimezone },
          create: { key: 'DEFAULT_TIMEZONE', value: general.defaultTimezone },
        });
      }
      if (general.defaultCountry) {
        await prisma.systemSetting.upsert({
          where: { key: 'DEFAULT_COUNTRY' },
          update: { value: general.defaultCountry },
          create: { key: 'DEFAULT_COUNTRY', value: general.defaultCountry },
        });
      }
    }

    // Update Messaging Rate Limits
    if (messaging) {
      if (messaging.messagesPerMinute !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: 'MESSAGES_PER_MINUTE' },
          update: { value: String(messaging.messagesPerMinute) },
          create: { key: 'MESSAGES_PER_MINUTE', value: String(messaging.messagesPerMinute) },
        });
      }
      if (messaging.maxConcurrentJobs !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: 'MAX_CONCURRENT_JOBS' },
          update: { value: String(messaging.maxConcurrentJobs) },
          create: { key: 'MAX_CONCURRENT_JOBS', value: String(messaging.maxConcurrentJobs) },
        });
      }
      if (messaging.retryLimit !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: 'RETRY_LIMIT' },
          update: { value: String(messaging.retryLimit) },
          create: { key: 'RETRY_LIMIT', value: String(messaging.retryLimit) },
        });
      }
    }

    // Update WhatsApp Config (only SUPER_ADMIN or ADMIN)
    if (whatsapp) {
      const existingConfig = await prisma.whatsAppConfig.findFirst();

      const updateData: any = {
        businessAccountId: whatsapp.businessAccountId,
        phoneNumberId: whatsapp.phoneNumberId,
        apiVersion: whatsapp.apiVersion || 'v20.0',
        verifyToken: whatsapp.verifyToken || 'wabulk_meta_webhook_verify_secret_token_123',
      };

      // Only update token if provided and not masked
      if (whatsapp.accessToken && !whatsapp.accessToken.includes('••••')) {
        updateData.accessTokenEncrypted = whatsapp.accessToken;
        updateData.isConfigured = true;
      }

      if (existingConfig) {
        await prisma.whatsAppConfig.update({
          where: { id: existingConfig.id },
          data: updateData,
        });
      } else {
        await prisma.whatsAppConfig.create({
          data: updateData,
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'SETTINGS_UPDATED',
        entity: 'SystemSettings',
        metadata: { updatedSections: Object.keys(body) },
      },
    });

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
