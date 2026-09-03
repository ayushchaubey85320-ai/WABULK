import prisma from '@/lib/db';
import { WhatsAppService, TemplateComponent } from '@/lib/whatsapp/whatsapp.service';
import { interpolateTemplate } from '@/lib/utils/interpolation';
import { validateAndFormatPhone } from '@/lib/utils/phone';
import { CampaignStatus, MessageStatus } from '@prisma/client';

export class CampaignEngine {
  /**
   * Discovers eligible contacts based on audience criteria.
   * Rule: Active, Opted In, Not Opted Out, Valid Phone.
   */
  public static async getEligibleContacts(
    audienceType: 'ALL' | 'GROUPS' | 'TAGS' | 'CONTACTS',
    filter?: { groupIds?: string[]; tagIds?: string[]; contactIds?: string[] }
  ) {
    const baseWhere: any = {
      status: 'ACTIVE',
      optedIn: true,
      optedOutAt: null,
    };

    if (audienceType === 'GROUPS' && filter?.groupIds && filter.groupIds.length > 0) {
      baseWhere.groups = {
        some: {
          groupId: { in: filter.groupIds },
        },
      };
    } else if (audienceType === 'TAGS' && filter?.tagIds && filter.tagIds.length > 0) {
      baseWhere.tags = {
        some: {
          tagId: { in: filter.tagIds },
        },
      };
    } else if (audienceType === 'CONTACTS' && filter?.contactIds && filter.contactIds.length > 0) {
      baseWhere.id = { in: filter.contactIds };
    }

    const contacts = await prisma.contact.findMany({
      where: baseWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        country: true,
      },
    });

    // Filter out invalid phones
    return contacts.filter((c) => validateAndFormatPhone(c.phone).isValid);
  }

  /**
   * Initializes and queues a campaign for execution.
   */
  public static async prepareCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.template.status !== 'APPROVED') {
      throw new Error(`Campaign cannot be started: Template "${campaign.template.name}" is not approved.`);
    }

    // Discover contacts
    const filter = campaign.audienceFilter as any;
    const eligibleContacts = await this.getEligibleContacts(campaign.audienceType as any, filter);

    if (eligibleContacts.length === 0) {
      throw new Error('No eligible contacts found matching this campaign audience criteria.');
    }

    const varMapping = (campaign.variableMapping as Record<string, string>) || {};

    // Create or update CampaignRecipients
    for (const contact of eligibleContacts) {
      const personalizedBody = interpolateTemplate(campaign.template.body, varMapping, contact);

      await prisma.campaignRecipient.upsert({
        where: {
          campaignId_contactId: {
            campaignId: campaign.id,
            contactId: contact.id,
          },
        },
        update: {
          personalizedBody,
          status: MessageStatus.QUEUED,
        },
        create: {
          campaignId: campaign.id,
          contactId: contact.id,
          status: MessageStatus.QUEUED,
          personalizedBody,
        },
      });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.QUEUED,
        totalRecipients: eligibleContacts.length,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        skippedCount: 0,
      },
    });

    return eligibleContacts.length;
  }

  /**
   * Executes the campaign sending loop.
   * Runs asynchronously in the background.
   */
  public static async executeCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign) return;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    // Fetch queued recipients
    const recipients = await prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: MessageStatus.QUEUED,
      },
      include: {
        contact: true,
      },
    });

    const varMapping = (campaign.variableMapping as Record<string, string>) || {};

    for (const recipient of recipients) {
      // Check if campaign was paused or cancelled mid-execution
      const currentCamp = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (currentCamp?.status === CampaignStatus.PAUSED || currentCamp?.status === CampaignStatus.CANCELLED) {
        break;
      }

      // Check opt-out again before sending
      if (!recipient.contact.optedIn || recipient.contact.optedOutAt || recipient.contact.status !== 'ACTIVE') {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: MessageStatus.SKIPPED,
            errorMessage: 'Contact opted out or deactivated prior to sending',
          },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { skippedCount: { increment: 1 } },
        });
        continue;
      }

      // Build WhatsApp template component parameters
      const templateVars = (campaign.template.variables as string[]) || [];
      const bodyParams: { type: 'text'; text: string }[] = [];

      for (const varKey of templateVars) {
        const sourceField = varMapping[varKey] || varKey;
        let val = '';
        if ((recipient.contact as any)[sourceField] !== undefined && (recipient.contact as any)[sourceField] !== null) {
          val = String((recipient.contact as any)[sourceField]);
        } else {
          val = sourceField;
        }
        bodyParams.push({ type: 'text', text: val });
      }

      const components: TemplateComponent[] = [];
      if (bodyParams.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParams,
        });
      }

      // Send through WhatsAppService
      const sendRes = await WhatsAppService.sendTemplateMessage(
        recipient.contact.phone,
        campaign.template.name,
        campaign.template.language || 'en_US',
        components
      );

      const now = new Date();

      if (sendRes.success) {
        // Record Message log
        const msg = await prisma.message.create({
          data: {
            campaignId: campaign.id,
            campaignRecipientId: recipient.id,
            contactId: recipient.contactId,
            whatsappMessageId: sendRes.whatsappMessageId,
            toPhone: recipient.contact.phone,
            templateName: campaign.template.name,
            body: recipient.personalizedBody || campaign.template.body,
            status: MessageStatus.SENT,
            rawPayload: { components } as any,
            rawResponse: sendRes.rawResponse as any,
            sentAt: now,
          },
        });

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: MessageStatus.SENT,
            sentAt: now,
          },
        });

        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });

        // If in Demo Mode, schedule automatic simulated delivery and read
        if (sendRes.isSimulated) {
          setTimeout(async () => {
            try {
              await prisma.message.updateMany({
                where: { id: msg.id },
                data: { status: MessageStatus.DELIVERED, deliveredAt: new Date() },
              });
              await prisma.campaignRecipient.updateMany({
                where: { id: recipient.id },
                data: { status: MessageStatus.DELIVERED, deliveredAt: new Date() },
              });
              await prisma.campaign.update({
                where: { id: campaignId },
                data: { deliveredCount: { increment: 1 } },
              });

              // 70% chance of being read after 2 seconds
              if (Math.random() > 0.3) {
                setTimeout(async () => {
                  try {
                    await prisma.message.updateMany({
                      where: { id: msg.id },
                      data: { status: MessageStatus.READ, readAt: new Date() },
                    });
                    await prisma.campaignRecipient.updateMany({
                      where: { id: recipient.id },
                      data: { status: MessageStatus.READ, readAt: new Date() },
                    });
                    await prisma.campaign.update({
                      where: { id: campaignId },
                      data: { readCount: { increment: 1 } },
                    });
                  } catch (e) {}
                }, 2000);
              }
            } catch (e) {}
          }, 1500);
        }
      } else {
        // Failed send
        await prisma.message.create({
          data: {
            campaignId: campaign.id,
            campaignRecipientId: recipient.id,
            contactId: recipient.contactId,
            toPhone: recipient.contact.phone,
            templateName: campaign.template.name,
            body: recipient.personalizedBody || campaign.template.body,
            status: MessageStatus.FAILED,
            errorMessage: sendRes.error || 'Sending failed',
            errorCode: sendRes.errorCode,
            rawResponse: sendRes.rawResponse as any,
            failedAt: now,
          },
        });

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: MessageStatus.FAILED,
            errorMessage: sendRes.error || 'Sending failed',
            failedAt: now,
          },
        });

        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      // Respect rate limit: delay between messages (e.g. 50ms)
      await new Promise((r) => setTimeout(r, 60));
    }

    // Check final status
    const remainingQueued = await prisma.campaignRecipient.count({
      where: { campaignId, status: MessageStatus.QUEUED },
    });

    const finalCamp = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (remainingQueued === 0 && finalCamp?.status === CampaignStatus.RUNNING) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  }
}
