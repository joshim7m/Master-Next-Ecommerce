import { NextResponse } from 'next/server';
import prisma from '../../../../../../src/lib/prisma';

export async function POST() {
  try {
    const settings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });

    const botToken = settings?.telegramBotToken || '';
    const chatId = settings?.telegramChatId || '';

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'Telegram bot token and chat id must be configured first.' },
        { status: 400 }
      );
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '\u2705 Test notification from the admin panel. Your Telegram order alerts are working!',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      const reason = data.description || `Telegram API responded with status ${res.status}`;
      return NextResponse.json({ error: `Test notification failed: ${reason}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: 'Test notification sent successfully.' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
