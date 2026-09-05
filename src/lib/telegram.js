import prisma from './prisma';

async function getConfig() {
  try {
    const settings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
    return {
      botToken: settings?.telegramBotToken || '',
      chatId: settings?.telegramChatId || '',
    };
  } catch {
    return {
      botToken: '',
      chatId: '',
    };
  }
}

export async function sendOrderAlert({ orderNo, total, name, mobile, address, shippingArea, itemCount }) {
  const { botToken, chatId } = await getConfig();

  if (!botToken || !chatId) {
    console.warn('[telegram] No bot token / chat id configured; skipping alert.');
    return null;
  }

  const text =
    `\u{1F6D2} New order #${orderNo}!\n` +
    `Customer: ${name}\n` +
    `Phone: ${mobile}\n` +
    `Area: ${shippingArea}\n` +
    `Total: \u09F3${total}\n` +
    `Items: ${itemCount}\n` +
    `Address: ${address}`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      console.error('[telegram] Failed to send alert:', res.status, JSON.stringify(data).slice(0, 300));
      return null;
    }
    console.log('[telegram] Order alert sent:', orderNo);
    return data;
  } catch (err) {
    console.error('[telegram] Error sending alert:', err.message);
    return null;
  }
}
