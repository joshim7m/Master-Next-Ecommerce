import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

async function getSettings() {
  let settings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    settings = await prisma.siteSetting.create({ data: { id: 'singleton' } });
  }
  return settings;
}

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      telegramBotToken: settings.telegramBotToken || '',
      telegramChatId: settings.telegramChatId || '',
      gtmId: settings.gtmId || '',
      whatsappNumber: settings.whatsappNumber || '',
      siteUrl: settings.siteUrl || '',
      jwtSecret: settings.jwtSecret || '',
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { telegramBotToken, telegramChatId, gtmId, whatsappNumber, siteUrl, jwtSecret } = body;

    const settings = await prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      update: {
        telegramBotToken: telegramBotToken || null,
        telegramChatId: telegramChatId || null,
        gtmId: gtmId || null,
        whatsappNumber: whatsappNumber || null,
        siteUrl: siteUrl || null,
        jwtSecret: jwtSecret || null,
      },
      create: {
        id: 'singleton',
        telegramBotToken: telegramBotToken || null,
        telegramChatId: telegramChatId || null,
        gtmId: gtmId || null,
        whatsappNumber: whatsappNumber || null,
        siteUrl: siteUrl || null,
        jwtSecret: jwtSecret || null,
      },
    });

    return NextResponse.json({
      telegramBotToken: settings.telegramBotToken || '',
      telegramChatId: settings.telegramChatId || '',
      gtmId: settings.gtmId || '',
      whatsappNumber: settings.whatsappNumber || '',
      siteUrl: settings.siteUrl || '',
      jwtSecret: settings.jwtSecret || '',
    });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
