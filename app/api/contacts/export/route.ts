import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    const where: any = {};
    if (groupId) {
      where.groups = { some: { groupId } };
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
      },
    });

    // Format as CSV
    const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Country', 'Opted In', 'Groups', 'Tags', 'Created At'];
    const rows = contacts.map((c) => [
      `"${(c.firstName || '').replace(/"/g, '""')}"`,
      `"${(c.lastName || '').replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${c.country || 'IN'}"`,
      c.optedIn ? 'YES' : 'NO',
      `"${c.groups.map((g) => g.group.name).join(';')}"`,
      `"${c.tags.map((t) => t.tag.name).join(';')}"`,
      `"${c.createdAt.toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="wabulk_contacts_${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to export contacts' }, { status: 500 });
  }
}
