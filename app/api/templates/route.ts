import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { TemplateSchema } from '@/lib/validation/schemas';
import { extractPlaceholders } from '@/lib/utils/interpolation';

export async function GET() {
  try {
    await requireAuth();
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        ...t,
        campaignCount: t._count.campaigns,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parseRes = TemplateSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseRes.error.flatten() }, { status: 400 });
    }

    const { name, language, category, status, header, body: bodyText, footer, metaTemplateId } = parseRes.data;

    const existing = await prisma.template.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 });
    }

    // Auto extract variables from header + body
    const fullText = `${header || ''} ${bodyText}`;
    const detectedVars = extractPlaceholders(fullText);

    const template = await prisma.template.create({
      data: {
        name,
        language: language || 'en_US',
        category: category as any,
        status: status as any,
        header: header || null,
        body: bodyText,
        footer: footer || null,
        variables: detectedVars,
        metaTemplateId: metaTemplateId || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'TEMPLATE_CREATED',
        entity: 'Template',
        entityId: template.id,
        metadata: { name: template.name, status: template.status },
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
