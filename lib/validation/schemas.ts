import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  rememberMe: z.boolean().optional().default(false),
});

export const ContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').trim(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  country: z.string().default('IN'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  optedIn: z.boolean().default(true),
  groupIds: z.array(z.string()).optional().default([]),
  tagIds: z.array(z.string()).optional().default([]),
});

export const ContactImportRowSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  groups: z.string().optional().nullable(),
});

export const GroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').trim(),
  description: z.string().optional().nullable(),
});

export const TagSchema = z.object({
  name: z.string().min(2, 'Tag name must be at least 2 characters').trim(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').default('#10B981'),
});

export const TemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required').regex(/^[a-z0-9_]+$/, 'Name must only contain lowercase letters, numbers, and underscores'),
  language: z.string().default('en_US'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).default('MARKETING'),
  status: z.enum(['DRAFT', 'PENDING_META', 'APPROVED', 'REJECTED']).default('DRAFT'),
  header: z.string().optional().nullable(),
  body: z.string().min(1, 'Template body is required'),
  footer: z.string().optional().nullable(),
  metaTemplateId: z.string().optional().nullable(),
});

export const CampaignCreateSchema = z.object({
  name: z.string().min(2, 'Campaign name is required').trim(),
  description: z.string().optional().nullable(),
  templateId: z.string().min(1, 'Please select a message template'),
  audienceType: z.enum(['ALL', 'GROUPS', 'TAGS', 'CONTACTS']).default('GROUPS'),
  audienceFilter: z.object({
    groupIds: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
    contactIds: z.array(z.string()).optional(),
  }).optional(),
  variableMapping: z.record(z.string()).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  sendNow: z.boolean().default(true),
});

export const WhatsAppConfigSchema = z.object({
  businessAccountId: z.string().min(1, 'Business Account ID is required'),
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
  accessToken: z.string().optional(),
  apiVersion: z.string().default('v20.0'),
  verifyToken: z.string().min(4, 'Webhook verify token is required'),
});

export const SystemSettingsSchema = z.object({
  orgName: z.string().min(1, 'Organization name is required'),
  defaultTimezone: z.string().default('Asia/Kolkata'),
  defaultCountry: z.string().default('IN'),
  messagesPerMinute: z.number().int().min(1).max(1000).default(60),
  maxConcurrentJobs: z.number().int().min(1).max(50).default(5),
  retryLimit: z.number().int().min(0).max(10).default(3),
  demoMode: z.boolean().default(true),
});

export const UserCreateSchema = z.object({
  name: z.string().min(2, 'User name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR']).default('OPERATOR'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});
