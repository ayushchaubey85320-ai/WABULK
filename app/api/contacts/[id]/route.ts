import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { ContactSchema } from '@/lib/validation/schemas';
import { validateAndFormatPhone } from '@/lib/utils/phone';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      contact: {
        ...contact,
        groups: contact.groups.map((g) => g.group),
        tags: contact.tags.map((t) => t.tag),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
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

    const parseRes = ContactSchema.partial().safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseRes.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, phone, email, country, status, optedIn, groupIds, tagIds } = parseRes.data;

    let formattedPhone: string | undefined = undefined;
    if (phone) {
      const phoneRes = validateAndFormatPhone(phone, country || 'IN');
      if (!phoneRes.isValid) {
        return NextResponse.json({ error: phoneRes.error || 'Invalid phone' }, { status: 400 });
      }
      formattedPhone = phoneRes.formatted;

      // Check duplicate
      const dup = await prisma.contact.findFirst({
        where: { phone: formattedPhone, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json({ error: 'Phone number already in use by another contact' }, { status: 409 });
      }
    }

    // Handle group and tag associations if provided
    if (groupIds) {
      await prisma.contactGroup.deleteMany({ where: { contactId: id } });
      await prisma.contactGroup.createMany({
        data: groupIds.map((gid) => ({ contactId: id, groupId: gid })),
      });
    }

    if (tagIds) {
      await prisma.contactTag.deleteMany({ where: { contactId: id } });
      await prisma.contactTag.createMany({
        data: tagIds.map((tid) => ({ contactId: id, tagId: tid })),
      });
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (formattedPhone !== undefined) updateData.phone = formattedPhone;
    if (email !== undefined) updateData.email = email;
    if (country !== undefined) updateData.country = country;
    if (status !== undefined) updateData.status = status;
    if (optedIn !== undefined) {
      updateData.optedIn = optedIn;
      updateData.optedOutAt = optedIn ? null : new Date();
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CONTACT_UPDATED',
        entity: 'Contact',
        entityId: contact.id,
        metadata: { phone: contact.phone },
      },
    });

    return NextResponse.json({
      success: true,
      contact: {
        ...contact,
        groups: contact.groups.map((g) => g.group),
        tags: contact.tags.map((t) => t.tag),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await prisma.contact.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CONTACT_DELETED',
        entity: 'Contact',
        entityId: id,
        metadata: { phone: contact.phone, name: `${contact.firstName} ${contact.lastName || ''}`.trim() },
      },
    });

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
