import prisma from '@/lib/db';

export interface WhatsAppSendResult {
  success: boolean;
  whatsappMessageId?: string;
  isSimulated?: boolean;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}

export interface TemplateComponentParam {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  [key: string]: any;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateComponentParam[];
  sub_type?: string;
  index?: string;
}

export class WhatsAppService {
  private static getEnvConfig() {
    return {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    };
  }

  /**
   * Checks if live Meta WhatsApp API credentials are configured.
   */
  public static async isConfigured(): Promise<boolean> {
    const config = this.getEnvConfig();
    if (config.accessToken && config.phoneNumberId) {
      return true;
    }

    // Check database config
    const dbConfig = await prisma.whatsAppConfig.findFirst({
      where: { isConfigured: true },
    });
    return !!(dbConfig && dbConfig.accessTokenEncrypted && dbConfig.phoneNumberId);
  }

  /**
   * Retrieves effective WhatsApp credentials (env takes precedence, then db).
   */
  public static async getCredentials() {
    const env = this.getEnvConfig();
    if (env.accessToken && env.phoneNumberId) {
      return {
        accessToken: env.accessToken,
        phoneNumberId: env.phoneNumberId,
        businessAccountId: env.businessAccountId,
        apiVersion: env.apiVersion,
        source: 'env',
      };
    }

    const dbConfig = await prisma.whatsAppConfig.findFirst();
    if (dbConfig && dbConfig.accessTokenEncrypted && dbConfig.phoneNumberId) {
      return {
        accessToken: dbConfig.accessTokenEncrypted,
        phoneNumberId: dbConfig.phoneNumberId,
        businessAccountId: dbConfig.businessAccountId || '',
        apiVersion: dbConfig.apiVersion || 'v20.0',
        source: 'database',
      };
    }

    return null;
  }

  /**
   * Validates credentials against Meta Graph API endpoint.
   */
  public static async validateConfiguration(): Promise<{
    valid: boolean;
    status: string;
    message: string;
    details?: any;
  }> {
    const creds = await this.getCredentials();
    if (!creds || !creds.accessToken || !creds.phoneNumberId) {
      return {
        valid: false,
        status: 'DEMO_MODE',
        message: 'WhatsApp API is not configured. Safe Demo Mode is active.',
      };
    }

    try {
      const url = `https://graph.facebook.com/${creds.apiVersion}/${creds.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return {
          valid: false,
          status: 'ERROR',
          message: data.error?.message || 'Failed to authenticate with Meta Graph API',
          details: data.error,
        };
      }

      return {
        valid: true,
        status: 'CONNECTED',
        message: `Successfully connected to Meta WhatsApp Business API (${data.display_phone_number || creds.phoneNumberId})`,
        details: data,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: 'NETWORK_ERROR',
        message: err?.message || 'Could not connect to Meta Graph API',
      };
    }
  }

  /**
   * Sends an approved official WhatsApp Template message.
   */
  public static async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    languageCode: string = 'en_US',
    components: TemplateComponent[] = []
  ): Promise<WhatsAppSendResult> {
    const creds = await this.getCredentials();

    // DEMO MODE SIMULATION
    if (!creds || !creds.accessToken || !creds.phoneNumberId) {
      // Clean phone number
      const cleanPhone = toPhone.replace(/[\s\-\+]/g, '');
      const fakeMsgId = `wamid.DEMO_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Simulate slight processing latency (20ms)
      await new Promise((r) => setTimeout(r, 20));

      return {
        success: true,
        whatsappMessageId: fakeMsgId,
        isSimulated: true,
        rawResponse: {
          messaging_product: 'whatsapp',
          contacts: [{ input: toPhone, wa_id: cleanPhone }],
          messages: [{ id: fakeMsgId, message_status: 'accepted' }],
          demo: true,
        },
      };
    }

    // REAL META CLOUD API CALL
    try {
      // WhatsApp requires number without leading '+'
      const recipientNumber = toPhone.replace(/^\+/, '').replace(/[\s\-]/g, '');

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: components.length > 0 ? components : undefined,
        },
      };

      const url = `https://graph.facebook.com/${creds.apiVersion}/${creds.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || 'Meta API rejected message',
          errorCode: String(data.error?.code || res.status),
          rawResponse: data,
        };
      }

      const msgId = data.messages?.[0]?.id;
      return {
        success: true,
        whatsappMessageId: msgId,
        isSimulated: false,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error while sending WhatsApp message',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Sends a standard session text message (only allowed within customer service 24h window).
   */
  public static async sendTextMessage(toPhone: string, body: string): Promise<WhatsAppSendResult> {
    const creds = await this.getCredentials();

    if (!creds || !creds.accessToken || !creds.phoneNumberId) {
      const fakeMsgId = `wamid.DEMO_TXT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        whatsappMessageId: fakeMsgId,
        isSimulated: true,
        rawResponse: { simulated: true },
      };
    }

    try {
      const recipientNumber = toPhone.replace(/^\+/, '').replace(/[\s\-]/g, '');
      const url = `https://graph.facebook.com/${creds.apiVersion}/${creds.phoneNumberId}/messages`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientNumber,
          type: 'text',
          text: { preview_url: false, body },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || 'Failed to send text message',
          errorCode: String(data.error?.code || res.status),
          rawResponse: data,
        };
      }

      return {
        success: true,
        whatsappMessageId: data.messages?.[0]?.id,
        isSimulated: false,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to communicate with Meta API',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}

export default WhatsAppService;
