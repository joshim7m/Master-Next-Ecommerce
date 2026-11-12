import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';
import { parseDeliveryAreas } from '../../../../../src/lib/deliveryAreas';
import { parseFreeDeliverySettings } from '../../../../../src/lib/freeDelivery';

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
    ...parseFreeDeliverySettings(settings),
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
    const { telegramBotToken, telegramChatId, gtmId, whatsappNumber, siteUrl, jwtSecret, deliveryAreas, freeDeliveryEnabled, freeDeliveryMinProducts } = body;

    // Only touch the column when the client actually sent it, so a partial PUT
    // can never wipe the configured zones back to the defaults.
    const deliveryAreasValue =
      deliveryAreas === undefined ? undefined : JSON.stringify(parseDeliveryAreas(deliveryAreas));

    // Same partial-PUT rule for the free-delivery promo. minProducts is clamped
    // to a sane integer so a stray value can't disable pricing entirely.
    const freeDeliveryPatch = {};
    if (freeDeliveryEnabled !== undefined) {
      freeDeliveryPatch.freeDeliveryEnabled = Boolean(freeDeliveryEnabled);
    }
    if (freeDeliveryMinProducts !== undefined) {
      const minProducts = Number(freeDeliveryMinProducts);
      if (Number.isFinite(minProducts) && minProducts >= 1) {
        freeDeliveryPatch.freeDeliveryMinProducts = Math.min(99, Math.floor(minProducts));
      }
    }

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
        ...freeDeliveryPatch,
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
        freeDeliveryEnabled: Boolean(freeDeliveryEnabled),
        freeDeliveryMinProducts: Number(freeDeliveryMinProducts) >= 1 ? Math.min(99, Math.floor(Number(freeDeliveryMinProducts))) : 2,
      },
    });

    return NextResponse.json(serializeSettings(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
