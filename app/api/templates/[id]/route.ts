import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { TemplateSchema } from '@/lib/validation/schemas';
import { extractPlaceholders } from '@/lib/utils/interpolation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const parseRes = TemplateSchema.partial().safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseRes.error.flatten() }, { status: 400 });
    }

    const { name, language, category, status, header, body: bodyText, footer, metaTemplateId } = parseRes.data;

    let detectedVars: string[] | undefined = undefined;
    if (bodyText !== undefined || header !== undefined) {
      const existing = await prisma.template.findUnique({ where: { id } });
      const fullText = `${header !== undefined ? header : existing?.header || ''} ${bodyText !== undefined ? bodyText : existing?.body || ''}`;
      detectedVars = extractPlaceholders(fullText);
    }

    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(language && { language }),
        ...(category && { category: category as any }),
        ...(status && { status: status as any }),
        ...(header !== undefined && { header }),
        ...(bodyText !== undefined && { body: bodyText }),
        ...(footer !== undefined && { footer }),
        ...(detectedVars !== undefined && { variables: detectedVars }),
        ...(metaTemplateId !== undefined && { metaTemplateId }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'TEMPLATE_UPDATED',
        entity: 'Template',
        entityId: id,
        metadata: { name: template.name, status: template.status },
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: { _count: { select: { campaigns: true } } },
    });

    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    if (template._count.campaigns > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is referenced by existing campaigns' },
        { status: 400 }
      );
    }

    await prisma.template.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'TEMPLATE_DELETED',
        entity: 'Template',
        entityId: id,
        metadata: { name: template.name },
      },
    });

    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
