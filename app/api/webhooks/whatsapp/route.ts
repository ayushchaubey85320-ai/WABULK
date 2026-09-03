import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { MessageStatus } from '@prisma/client';

/**
 * Meta Webhook Verification (GET request)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const config = await prisma.whatsAppConfig.findFirst();
  const expectedToken = config?.verifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'wabulk_meta_webhook_verify_secret_token_123';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Webhook verified successfully by Meta');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Verification token mismatch', { status: 403 });
}

/**
 * Meta Webhook Event Handler (POST request)
 * Processes status updates (sent, delivered, read, failed) & inbound opt-out messages
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // 1. Process Status Events (sent, delivered, read, failed)
        const statuses = value.statuses || [];
        for (const statusUpdate of statuses) {
          const waMsgId = statusUpdate.id;
          const statusStr = statusUpdate.status; // 'sent' | 'delivered' | 'read' | 'failed'
          const timestamp = statusUpdate.timestamp ? new Date(parseInt(statusUpdate.timestamp) * 1000) : new Date();

          // Idempotency: generate event ID
          const eventId = `status_${waMsgId}_${statusStr}`;
          const existingEvent = await prisma.webhookEvent.findUnique({ where: { eventId } });
          if (existingEvent) {
            continue; // Already processed idempotently
          }

          await prisma.webhookEvent.create({
            data: {
              eventId,
              eventType: `message_${statusStr}`,
              payload: statusUpdate,
              status: 'PROCESSED',
            },
          });

          let newStatus: MessageStatus = MessageStatus.SENT;
          if (statusStr === 'delivered') newStatus = MessageStatus.DELIVERED;
          else if (statusStr === 'read') newStatus = MessageStatus.READ;
          else if (statusStr === 'failed') newStatus = MessageStatus.FAILED;

          // Find message by whatsappMessageId
          const message = await prisma.message.findUnique({
            where: { whatsappMessageId: waMsgId },
            include: { campaignRecipient: true },
          });

          if (message) {
            const updateData: any = { status: newStatus };
            if (statusStr === 'delivered' && !message.deliveredAt) updateData.deliveredAt = timestamp;
            if (statusStr === 'read' && !message.readAt) updateData.readAt = timestamp;
            if (statusStr === 'failed') {
              updateData.failedAt = timestamp;
              const errorObj = statusUpdate.errors?.[0];
              if (errorObj) {
                updateData.errorMessage = errorObj.title || errorObj.message || 'WhatsApp delivery failed';
                updateData.errorCode = String(errorObj.code || '');
              }
            }

            await prisma.message.update({
              where: { id: message.id },
              data: updateData,
            });

            if (message.campaignRecipientId) {
              await prisma.campaignRecipient.update({
                where: { id: message.campaignRecipientId },
                data: updateData,
              });
            }

            // Update campaign counters
            if (message.campaignId) {
              if (statusStr === 'delivered') {
                await prisma.campaign.update({
                  where: { id: message.campaignId },
                  data: { deliveredCount: { increment: 1 } },
                });
              } else if (statusStr === 'read') {
                await prisma.campaign.update({
                  where: { id: message.campaignId },
                  data: { readCount: { increment: 1 } },
                });
              } else if (statusStr === 'failed') {
                await prisma.campaign.update({
                  where: { id: message.campaignId },
                  data: { failedCount: { increment: 1 } },
                });
              }
            }
          }
        }

        // 2. Process Inbound Messages (Opt-Out Keyword Detection)
        const messages = value.messages || [];
        for (const inboundMsg of messages) {
          const fromPhone = inboundMsg.from; // e.g. "919876543210"
          const textBody = inboundMsg.text?.body?.trim().toUpperCase();

          if (textBody && ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT'].includes(textBody)) {
            // Find contact matching this phone number (formatted with + or without)
            const phoneFormats = [`+${fromPhone}`, fromPhone];
            const contact = await prisma.contact.findFirst({
              where: { phone: { in: phoneFormats } },
            });

            if (contact && contact.optedIn) {
              await prisma.contact.update({
                where: { id: contact.id },
                data: {
                  optedIn: false,
                  optedOutAt: new Date(),
                },
              });

              await prisma.auditLog.create({
                data: {
                  action: 'CONTACT_OPT_OUT',
                  entity: 'Contact',
                  entityId: contact.id,
                  metadata: {
                    phone: contact.phone,
                    keyword: textBody,
                    source: 'WEBHOOK_AUTO_OPT_OUT',
                  },
                },
              });

              console.log(`🚫 Contact ${contact.phone} opted out via message "${textBody}"`);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, status: 'processed' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Meta expects 200 OK so it doesn't repeatedly retry failing payloads forever
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
