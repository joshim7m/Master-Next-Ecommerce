import { load } from 'cheerio';

export function injectAdsIntoContent(html, ads = []) {
  if (!ads.length || !html) return html;

  const $ = load(html);
  const blockElements = $('p, h2, h3, h4, blockquote, ul, ol, pre').toArray();

  if (blockElements.length < 3) return html;

  const positions = getAdPositions(blockElements.length, ads.length);

  positions.forEach((pos, i) => {
    const target = blockElements[pos];
    const ad = ads[i];
    if (!target || !ad) return;

    const t = escHtml(ad.title);
    const txt = escHtml(ad.text || '');
    const link = escHtml(ad.productLink || '#');
    const price = ad.price ? `\u09F3${parseFloat(ad.price).toLocaleString()}` : '';
    const imgHtml = ad.image
      ? `<div class="flex w-24 shrink-0 sm:w-28"><img src="${escHtml(ad.image)}" alt="${t}" class="min-h-0 flex-1 object-cover" loading="lazy" /></div>`
      : '';

    const adHtml = `
      <div class="blog-ad my-6" data-ad-id="${ad.id}">
        <a href="${link}" target="_blank" rel="noopener noreferrer"
           class="group flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 transition hover:shadow-md hover:border-amber-300 dark:border-slate-600 dark:from-slate-800 dark:to-slate-800/80 dark:hover:border-amber-500/50 no-underline">
          ${imgHtml}
          <div class="flex flex-1 items-center gap-2 px-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1">${t}</p>
              ${txt ? `<p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">${txt}</p>` : ''}
              ${price ? `<p class="mt-1 text-sm font-bold text-[#2f0f6b] dark:text-[#a78bfa]">${price}</p>` : ''}
            </div>
            <span class="inline-flex items-center gap-1 shrink-0 rounded-md bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition group-hover:from-amber-500 group-hover:to-orange-500 dark:from-amber-500 dark:to-orange-500">
              Shop
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </a>
      </div>`;

    $(target).after(adHtml);
  });

  return $.html();
}

function getAdPositions(totalBlocks, adCount) {
  if (adCount <= 0) return [];
  if (adCount >= totalBlocks) {
    return Array.from({ length: totalBlocks - 1 }, (_, i) => i + 1);
  }
  const positions = [];
  const gap = Math.floor(totalBlocks / (adCount + 1));
  for (let i = 0; i < adCount; i++) {
    positions.push(gap * (i + 1));
  }
  return positions;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
