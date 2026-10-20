import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';
import { parseDeliveryAreas } from '../../../../../src/lib/deliveryAreas';

async function getSettings() {
  let settings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    settings = await prisma.siteSetting.create({ data: { id: 'singleton' } });
  }
  return settings;
}

function serializeSettings(settings) {
  return {
    telegramBotToken: settings.telegramBotToken || '',
    telegramChatId: settings.telegramChatId || '',
    gtmId: settings.gtmId || '',
    whatsappNumber: settings.whatsappNumber || '',
    siteUrl: settings.siteUrl || '',
    jwtSecret: settings.jwtSecret || '',
    deliveryAreas: parseDeliveryAreas(settings.deliveryAreas),
  };
}

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(serializeSettings(settings));
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { telegramBotToken, telegramChatId, gtmId, whatsappNumber, siteUrl, jwtSecret, deliveryAreas } = body;

    // Only touch the column when the client actually sent it, so a partial PUT
    // can never wipe the configured zones back to the defaults.
    const deliveryAreasValue =
      deliveryAreas === undefined ? undefined : JSON.stringify(parseDeliveryAreas(deliveryAreas));

    const settings = await prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      update: {
        telegramBotToken: telegramBotToken || null,
        telegramChatId: telegramChatId || null,
        gtmId: gtmId || null,
        whatsappNumber: whatsappNumber || null,
        siteUrl: siteUrl || null,
        jwtSecret: jwtSecret || null,
        ...(deliveryAreasValue !== undefined && { deliveryAreas: deliveryAreasValue }),
      },
      create: {
        id: 'singleton',
        telegramBotToken: telegramBotToken || null,
        telegramChatId: telegramChatId || null,
        gtmId: gtmId || null,
        whatsappNumber: whatsappNumber || null,
        siteUrl: siteUrl || null,
        jwtSecret: jwtSecret || null,
        deliveryAreas: deliveryAreasValue ?? null,
      },
    });

    return NextResponse.json(serializeSettings(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
