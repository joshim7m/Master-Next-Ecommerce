import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
      settings = await prisma.siteSetting.create({ data: { id: 'singleton' } });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching site settings:', error.message, error.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { siteName, logo, favicon, mobile, email, address, copyrightText, announcementText, aboutCompany, aboutCompanyBn, metaTitle, metaDescription, metaKeywords, ogImage } = body;

    const settings = await prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      update: {
        siteName, logo, favicon, mobile, email, address, copyrightText, announcementText, aboutCompany, aboutCompanyBn,
        metaTitle, metaDescription, metaKeywords, ogImage,
      },
      create: {
        id: 'singleton', siteName, logo, favicon, mobile, email, address, copyrightText, announcementText, aboutCompany, aboutCompanyBn,
        metaTitle, metaDescription, metaKeywords, ogImage,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving site settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
