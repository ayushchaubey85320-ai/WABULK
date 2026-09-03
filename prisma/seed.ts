import { PrismaClient, Role, UserStatus, ContactStatus, TemplateCategory, TemplateStatus, CampaignStatus, AudienceType, MessageStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting WABulk database seed...');

  // 1. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
  const operatorPasswordHash = await bcrypt.hash('Operator@123456', salt);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: 'System Super Admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {
      passwordHash: operatorPasswordHash,
      role: Role.OPERATOR,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: 'Campaign Operator',
      email: 'operator@example.com',
      passwordHash: operatorPasswordHash,
      role: Role.OPERATOR,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Users seeded: admin@example.com, operator@example.com');

  // 2. Seed Settings
  const settings = [
    { key: 'ORG_NAME', value: 'WABulk Technologies', description: 'Organization Name' },
    { key: 'DEFAULT_TIMEZONE', value: 'Asia/Kolkata', description: 'Default System Timezone' },
    { key: 'DEFAULT_COUNTRY', value: 'IN', description: 'Default Country Code' },
    { key: 'MESSAGES_PER_MINUTE', value: '60', description: 'Sending rate limit per minute' },
    { key: 'MAX_CONCURRENT_JOBS', value: '5', description: 'Max parallel message sending workers' },
    { key: 'RETRY_LIMIT', value: '3', description: 'Retry attempts for failed temporary sends' },
    { key: 'DEMO_MODE', value: 'true', description: 'Enable simulated messaging when Meta API is unconfigured' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✅ System settings seeded');

  // 3. Seed Groups
  const groupData = [
    { name: 'Customers', description: 'Active paying customers and clients' },
    { name: 'Employees', description: 'Internal staff and team members' },
    { name: 'VIP Leads', description: 'High-intent enterprise prospects' },
    { name: 'Event Participants', description: 'Registered attendees for upcoming conference' },
  ];

  const groups: Record<string, any> = {};
  for (const g of groupData) {
    groups[g.name] = await prisma.group.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: g,
    });
  }
  console.log('✅ Groups seeded');

  // 4. Seed Tags
  const tagData = [
    { name: 'VIP', color: '#F59E0B' },
    { name: 'New Lead', color: '#3B82F6' },
    { name: 'Delhi', color: '#10B981' },
    { name: 'Mumbai', color: '#8B5CF6' },
    { name: 'Bangalore', color: '#EC4899' },
    { name: 'Pending', color: '#EF4444' },
    { name: 'Paid', color: '#059669' },
  ];

  const tags: Record<string, any> = {};
  for (const t of tagData) {
    tags[t.name] = await prisma.tag.upsert({
      where: { name: t.name },
      update: { color: t.color },
      create: t,
    });
  }
  console.log('✅ Tags seeded');

  // 5. Seed Contacts
  const contactsData = [
    { firstName: 'Rahul', lastName: 'Sharma', phone: '+919876543210', email: 'rahul.sharma@example.com', country: 'IN', groups: ['Customers', 'Event Participants'], tags: ['VIP', 'Delhi', 'Paid'] },
    { firstName: 'Priya', lastName: 'Singh', phone: '+919812345678', email: 'priya.singh@example.com', country: 'IN', groups: ['Customers'], tags: ['VIP', 'Mumbai', 'Paid'] },
    { firstName: 'Aman', lastName: 'Verma', phone: '+919922334455', email: 'aman.verma@example.com', country: 'IN', groups: ['Employees'], tags: ['Delhi'] },
    { firstName: 'Neha', lastName: 'Gupta', phone: '+919833445566', email: 'neha.gupta@example.com', country: 'IN', groups: ['VIP Leads'], tags: ['New Lead', 'Bangalore'] },
    { firstName: 'Vikram', lastName: 'Patel', phone: '+919744556677', email: 'vikram.patel@example.com', country: 'IN', groups: ['Customers', 'VIP Leads'], tags: ['VIP', 'Paid'] },
    { firstName: 'Ananya', lastName: 'Deshmukh', phone: '+919655667788', email: 'ananya.d@example.com', country: 'IN', groups: ['Event Participants'], tags: ['New Lead', 'Mumbai'] },
    { firstName: 'Rohan', lastName: 'Mehta', phone: '+919566778899', email: 'rohan.mehta@example.com', country: 'IN', groups: ['Customers'], tags: ['Delhi', 'Paid'] },
    { firstName: 'Sneha', lastName: 'Reddy', phone: '+919477889900', email: 'sneha.reddy@example.com', country: 'IN', groups: ['VIP Leads'], tags: ['Bangalore', 'Pending'] },
    { firstName: 'Karan', lastName: 'Malhotra', phone: '+919388990011', email: 'karan.m@example.com', country: 'IN', groups: ['Employees'], tags: ['Delhi'] },
    { firstName: 'Pooja', lastName: 'Joshi', phone: '+919299001122', email: 'pooja.joshi@example.com', country: 'IN', groups: ['Customers', 'Event Participants'], tags: ['Mumbai', 'Paid'] },
  ];

  for (const c of contactsData) {
    const contact = await prisma.contact.upsert({
      where: { phone: c.phone },
      update: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        country: c.country,
        optedIn: true,
      },
      create: {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        country: c.country,
        optedIn: true,
      },
    });

    // Link groups
    for (const gName of c.groups) {
      if (groups[gName]) {
        await prisma.contactGroup.upsert({
          where: { contactId_groupId: { contactId: contact.id, groupId: groups[gName].id } },
          update: {},
          create: { contactId: contact.id, groupId: groups[gName].id },
        });
      }
    }

    // Link tags
    for (const tName of c.tags) {
      if (tags[tName]) {
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId: contact.id, tagId: tags[tName].id } },
          update: {},
          create: { contactId: contact.id, tagId: tags[tName].id },
        });
      }
    }
  }
  console.log('✅ Contacts, ContactGroups & ContactTags seeded');

  // 6. Seed Templates
  const templateData = [
    {
      name: 'appointment_reminder',
      language: 'en_US',
      category: TemplateCategory.UTILITY,
      status: TemplateStatus.APPROVED,
      header: 'Appointment Confirmation',
      body: 'Hello {{1}},\n\nYour appointment is confirmed for {{2}}.\n\nThank you for choosing WABulk!',
      footer: 'Reply STOP to unsubscribe',
      variables: ['1', '2'],
      metaTemplateId: 'meta_tpl_appmt_001',
    },
    {
      name: 'order_update',
      language: 'en_US',
      category: TemplateCategory.UTILITY,
      status: TemplateStatus.APPROVED,
      header: 'Order Status Update',
      body: 'Hi {{1}},\n\nYour order #{{2}} has been dispatched! Track your shipment online.\n\nBest regards,\nCustomer Care',
      footer: 'Official Notification',
      variables: ['1', '2'],
      metaTemplateId: 'meta_tpl_order_002',
    },
    {
      name: 'event_invitation',
      language: 'en_US',
      category: TemplateCategory.MARKETING,
      status: TemplateStatus.APPROVED,
      header: 'Special Invitation',
      body: 'Greetings {{1}},\n\nYou are cordially invited to attend {{2}} on {{3}}. We look forward to welcoming you!\n\nWarm regards,\nEvent Team',
      footer: 'Reply STOP to opt-out',
      variables: ['1', '2', '3'],
      metaTemplateId: 'meta_tpl_event_003',
    },
    {
      name: 'welcome_discount',
      language: 'en_US',
      category: TemplateCategory.MARKETING,
      status: TemplateStatus.APPROVED,
      header: 'Exclusive Welcome Offer',
      body: 'Welcome {{1}}!\n\nEnjoy an exclusive 20% discount on your next purchase using code {{2}}.\n\nValid until this Sunday!',
      footer: 'Terms & conditions apply',
      variables: ['1', '2'],
      metaTemplateId: 'meta_tpl_promo_004',
    },
  ];

  const templates: Record<string, any> = {};
  for (const t of templateData) {
    templates[t.name] = await prisma.template.upsert({
      where: { name: t.name },
      update: t,
      create: t,
    });
  }
  console.log('✅ Official WhatsApp message templates seeded');

  // 7. Seed Demo Completed Campaign with message logs
  const customerContacts = await prisma.contact.findMany({
    where: { groups: { some: { group: { name: 'Customers' } } } },
    take: 4,
  });

  const demoCampaign = await prisma.campaign.upsert({
    where: { id: 'demo-campaign-august-launch' },
    update: {},
    create: {
      id: 'demo-campaign-august-launch',
      name: 'Welcome Customers Announcement',
      description: 'Official welcome and update broadcast for verified customers',
      status: CampaignStatus.COMPLETED,
      templateId: templates['appointment_reminder'].id,
      audienceType: AudienceType.GROUPS,
      audienceFilter: { groupIds: [groups['Customers'].id] },
      variableMapping: { '1': 'firstName', '2': 'Tomorrow at 10:00 AM' },
      totalRecipients: customerContacts.length,
      sentCount: customerContacts.length,
      deliveredCount: customerContacts.length - 1,
      readCount: customerContacts.length - 2,
      failedCount: 0,
      skippedCount: 0,
      startedAt: new Date(Date.now() - 3600 * 1000 * 24),
      completedAt: new Date(Date.now() - 3600 * 1000 * 23),
      createdById: adminUser.id,
    },
  });

  for (let i = 0; i < customerContacts.length; i++) {
    const contact = customerContacts[i];
    const status = i === 0 ? MessageStatus.READ : i === 1 ? MessageStatus.DELIVERED : MessageStatus.SENT;
    const waMsgId = `wamid.HBgLOTE5ODc2N${i}ABCD1234`;

    const recipient = await prisma.campaignRecipient.upsert({
      where: { campaignId_contactId: { campaignId: demoCampaign.id, contactId: contact.id } },
      update: {},
      create: {
        campaignId: demoCampaign.id,
        contactId: contact.id,
        status: status,
        personalizedBody: `Hello ${contact.firstName},\n\nYour appointment is confirmed for Tomorrow at 10:00 AM.\n\nThank you for choosing WABulk!`,
        sentAt: new Date(Date.now() - 3600 * 1000 * 23.9),
        deliveredAt: (status === MessageStatus.DELIVERED || status === MessageStatus.READ) ? new Date(Date.now() - 3600 * 1000 * 23.8) : null,
        readAt: status === MessageStatus.READ ? new Date(Date.now() - 3600 * 1000 * 23.5) : null,
      },
    });

    await prisma.message.upsert({
      where: { whatsappMessageId: waMsgId },
      update: {},
      create: {
        campaignId: demoCampaign.id,
        campaignRecipientId: recipient.id,
        contactId: contact.id,
        whatsappMessageId: waMsgId,
        toPhone: contact.phone,
        templateName: 'appointment_reminder',
        body: `Hello ${contact.firstName},\n\nYour appointment is confirmed for Tomorrow at 10:00 AM.`,
        status: status,
        sentAt: recipient.sentAt,
        deliveredAt: recipient.deliveredAt,
        readAt: recipient.readAt,
      },
    });
  }

  console.log('✅ Demo campaign with full message history seeded');

  // 8. Seed Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: 'INITIAL_SYSTEM_SEED',
      entity: 'System',
      metadata: { note: 'Initial seed executed successfully with sample data' },
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 WABulk database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
