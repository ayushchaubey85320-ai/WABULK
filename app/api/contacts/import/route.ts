import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/jwt';
import { validateAndFormatPhone } from '@/lib/utils/phone';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      rows,
      mapping,
      groupIds = [],
      tagIds = [],
      mode = 'import', // 'validate' | 'import'
    } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data rows provided for import' }, { status: 400 });
    }

    if (!mapping || !mapping.phone) {
      return NextResponse.json({ error: 'Phone column mapping is required' }, { status: 400 });
    }

    // Existing phone numbers cache to detect duplicates
    const existingContacts = await prisma.contact.findMany({
      select: { phone: true },
    });
    const existingPhonesSet = new Set(existingContacts.map((c) => c.phone));
    const processedInBatch = new Set<string>();

    const validRecords: any[] = [];
    const invalidRecords: { rowNumber: number; phone: string; reason: string; data: any }[] = [];
    let duplicateCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const rawPhone = row[mapping.phone];
      const rawFirstName = mapping.firstName ? row[mapping.firstName] : '';
      const rawLastName = mapping.lastName ? row[mapping.lastName] : '';
      const rawEmail = mapping.email ? row[mapping.email] : '';
      const rawCountry = mapping.country ? row[mapping.country] : 'IN';

      if (!rawPhone) {
        invalidRecords.push({
          rowNumber: rowNum,
          phone: '',
          reason: 'Missing phone number',
          data: row,
        });
        continue;
      }

      const phoneRes = validateAndFormatPhone(rawPhone, rawCountry || 'IN');
      if (!phoneRes.isValid) {
        invalidRecords.push({
          rowNumber: rowNum,
          phone: String(rawPhone),
          reason: phoneRes.error || 'Invalid phone format (must be E.164)',
          data: row,
        });
        continue;
      }

      const phone = phoneRes.formatted;

      if (existingPhonesSet.has(phone) || processedInBatch.has(phone)) {
        duplicateCount++;
        invalidRecords.push({
          rowNumber: rowNum,
          phone,
          reason: 'Duplicate phone number (already exists)',
          data: row,
        });
        continue;
      }

      processedInBatch.add(phone);

      validRecords.push({
        firstName: String(rawFirstName || 'Contact').trim(),
        lastName: rawLastName ? String(rawLastName).trim() : null,
        phone,
        email: rawEmail ? String(rawEmail).trim() : null,
        country: rawCountry ? String(rawCountry).trim() : 'IN',
        optedIn: true,
      });
    }

    // If just validating (Step 4 & 5 of wizard)
    if (mode === 'validate') {
      return NextResponse.json({
        totalRows: rows.length,
        validCount: validRecords.length,
        invalidCount: invalidRecords.length,
        duplicateCount,
        preview: validRecords.slice(0, 50),
        invalidSummary: invalidRecords.slice(0, 20),
      });
    }

    // Step 6: Actually import valid records into DB
    let importedCount = 0;

    // Use transaction in chunks of 100 to avoid locking
    const CHUNK_SIZE = 100;
    for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + CHUNK_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const record of chunk) {
          const created = await tx.contact.create({
            data: {
              firstName: record.firstName,
              lastName: record.lastName,
              phone: record.phone,
              email: record.email,
              country: record.country,
              optedIn: true,
              groups: {
                create: groupIds.map((gid: string) => ({ groupId: gid })),
              },
              tags: {
                create: tagIds.map((tid: string) => ({ tagId: tid })),
              },
            },
          });
          if (created) importedCount++;
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'CONTACTS_IMPORTED',
        entity: 'Contact',
        metadata: {
          totalRows: rows.length,
          importedCount,
          invalidCount: invalidRecords.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      importedCount,
      invalidCount: invalidRecords.length,
      duplicateCount,
      errors: invalidRecords,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import contacts' }, { status: 500 });
  }
}
