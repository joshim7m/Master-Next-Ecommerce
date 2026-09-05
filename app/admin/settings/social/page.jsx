'use client';

import { useEffect, useState, useMemo } from 'react';

const PER_PAGE = 10;

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { value: 'twitter', label: 'X (Twitter)', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { value: 'instagram', label: 'Instagram', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
  { value: 'linkedin', label: 'LinkedIn', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  { value: 'youtube', label: 'YouTube', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  { value: 'whatsapp', label: 'WhatsApp', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
  { value: 'pinterest', label: 'Pinterest', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.936 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.67.968-2.914 2.172-2.914 1.027 0 1.523.77 1.523 1.694 0 1.032-.656 2.575-.997 4.005-.284 1.197.6 2.177 1.781 2.177 2.138 0 3.787-2.255 3.787-5.509 0-2.879-2.067-4.896-5.022-4.896-3.42 0-5.427 2.565-5.427 5.215 0 1.033.397 2.14.893 2.745.098.12.112.225.084.345-.09.376-.293 1.199-.334 1.363-.053.222-.174.269-.401.162-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.358-.631-2.749-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg> },
  { value: 'tiktok', label: 'TikTok', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
  { value: 'snapchat', label: 'Snapchat', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.792.282 8.056 4.03 1.854 2.128 2.678 4.568 2.678 7.136 0 1.271-.297 2.48-.687 3.543.215.325.566.641.994.822.34.145.703.169 1.056.145.496-.035 1.003-.176 1.388-.362.327-.156.565-.378.565-.69 0-.53-.686-1.092-1.17-1.36-.472-.261-.566-.678-.536-.935.046-.428.438-.625.68-.73.577-.25 1.127-.469 1.63-.768.545-.326.909-.79.909-1.329 0-.67-.676-1.13-1.414-1.13-.277 0-.545.079-.748.18-.498.25-1.019.534-1.554.534-.472 0-.88-.196-1.108-.547.126-.527.188-1.072.188-1.62 0-3.432-1.422-6.18-4.315-8.29-2.326-1.696-5.204-2.522-8.028-2.522-2.826 0-5.704.826-8.03 2.521C2.776 5.778 1.354 8.527 1.354 11.96c0 .547.062 1.093.188 1.62-.228.351-.636.546-1.108.546-.535 0-1.056-.284-1.554-.534-.203-.1-.47-.18-.748-.18-.738 0-1.414.46-1.414 1.13 0 .538.364 1.003.909 1.329.503.299 1.053.517 1.63.768.242.105.634.302.68.73.03.257-.064.674-.536.936-.484.267-1.17.829-1.17 1.36 0 .311.238.533.565.69.385.185.892.326 1.388.361.353.025.716 0 1.056-.145.427-.18.779-.496.994-.822.39-1.064.687-2.272.687-3.543 0-2.568.824-5.008 2.68-7.137 3.262-3.748 7.064-4.03 8.054-4.03h.002z"/></svg> },
  { value: 'telegram', label: 'Telegram', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
  { value: 'github', label: 'GitHub', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> },
  { value: 'discord', label: 'Discord', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg> },
  { value: 'reddit', label: 'Reddit', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.052 1.587.026.173.039.348.039.526 0 3.48-3.912 6.3-8.736 6.3-4.822 0-8.735-2.82-8.735-6.3 0-.178.013-.353.039-.527a1.753 1.753 0 01-1.004-1.586c0-.968.786-1.754 1.754-1.754.48 0 .903.183 1.212.493 1.177-.843 2.804-1.4 4.6-1.483l.903-4.226a.508.508 0 01.49-.403l3.387-.712c.343.68.988 1.13 1.74 1.13zm-8.454 6.404c-.326 0-.56.256-.56.607 0 .352.234.608.56.608.327 0 .56-.256.56-.608 0-.35-.233-.607-.56-.607zm.79 2.135c-.397-.348-1.047-.293-1.454.122-.405.417-.41 1.067-.014 1.416.74.657 1.895.988 2.932.756.353-.078.586-.481.434-.856-.15-.375-.601-.524-.954-.447-.413.09-.904-.009-1.25-.309.306-.176.54-.496.54-.882 0-.37-.289-.525-.534-.6.096-.15.163-.262.3-.376zm2.854.882c.327 0 .56.256.56.608 0 .351-.233.607-.56.607-.326 0-.56-.256-.56-.608 0-.352.234-.607.56-.607zm.79 2.135c-.397-.348-1.047-.293-1.454.122-.404.417-.41 1.067-.013 1.416.739.657 1.894.988 2.931.756.353-.078.586-.481.434-.856-.15-.375-.601-.524-.954-.447-.413.09-.903-.009-1.25-.309.306-.176.54-.496.54-.882 0-.37-.289-.525-.534-.6a1.812 1.812 0 01.3-.376z"/></svg> },
  { value: 'medium', label: 'Medium', icon: (cls) => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42c1.87 0 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg> },
  { value: 'globe', label: 'Website', icon: (cls) => <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg> },
];

const platformMap = Object.fromEntries(PLATFORMS.map((p) => [p.value, p]));

function SocialIcon({ icon, className = 'h-5 w-5' }) {
  const platform = platformMap[icon];
  if (platform) return platform.icon(className);
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function LinkCard({ link, onEdit, onDelete, onMove, isFirst, isLast }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
          <SocialIcon icon={link.icon || ''} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{link.name}</h3>
            <span className={`flex-shrink-0 inline-flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${link.isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-900/30 dark:text-slate-500'}`}>
              {link.isActive ? 'Active' : 'Off'}
            </span>
          </div>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-xs text-slate-500 hover:text-[#2f0f6b] transition dark:text-slate-400 dark:hover:text-[#a78bfa]">{link.url}</a>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(link.id, -1)} disabled={isFirst} className="rounded p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">#{link.order}</span>
          <button onClick={() => onMove(link.id, 1)} disabled={isLast} className="rounded p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(link)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#2f0f6b]/10 hover:text-[#2f0f6b] dark:hover:bg-[#a78bfa]/10 dark:hover:text-[#a78bfa]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => onDelete(link.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SocialSettingsPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', icon: '', isActive: true });
  const [page, setPage] = useState(0);

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/admin/settings/social');
      setLinks(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLinks(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();
    return links.filter((l) => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
  }, [links, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const resetForm = () => setForm({ name: '', url: '', icon: '', isActive: true });

  const openCreate = () => { setEditing('new'); resetForm(); };

  const openEdit = (link) => {
    setEditing(link.id);
    setForm({ name: link.name, url: link.url, icon: link.icon || '', isActive: link.isActive });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePlatformSelect = (platformValue) => {
    const platform = platformMap[platformValue];
    if (platform) {
      setForm((prev) => ({ ...prev, name: platform.label, icon: platform.value }));
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.url) return;
    try {
      if (editing === 'new') {
        await fetch('/api/admin/settings/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`/api/admin/settings/social/${editing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
    } catch {}
    setEditing(null);
    resetForm();
    fetchLinks();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this social link?')) return;
    try { await fetch(`/api/admin/settings/social/${id}`, { method: 'DELETE' }); } catch {}
    fetchLinks();
  };

  const handleMove = async (id, direction) => {
    const idx = links.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= links.length) return;

    const updated = [...links];
    const temp = updated[idx].order;
    updated[idx].order = updated[newIdx].order;
    updated[newIdx].order = temp;
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setLinks(updated);

    await Promise.all([
      fetch(`/api/admin/settings/social/${updated[idx].id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: updated[idx].order }),
      }),
      fetch(`/api/admin/settings/social/${updated[newIdx].id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: updated[newIdx].order }),
      }),
    ]);
  };

  if (loading) {
    return (
      <section className="space-y-4 p-4 sm:space-y-6 sm:p-0">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-3 sm:hidden">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
        <div className="hidden h-64 animate-pulse rounded-xl border border-slate-200 bg-white sm:block dark:border-slate-700 dark:bg-slate-800" />
      </section>
    );
  }

  return (
    <section className="space-y-4 p-4 sm:space-y-6 sm:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Social Media</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{links.length} {links.length === 1 ? 'link' : 'links'}</p>
        </div>
        <button onClick={openCreate} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f0f6b] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 sm:w-auto dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Link
        </button>
      </div>

      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search links…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
      </div>

      {editing && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{editing === 'new' ? 'Create Link' : 'Edit Link'}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Platform</label>
              <select
                onChange={(e) => handlePlatformSelect(e.target.value)}
                value={form.icon}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
              >
                <option value="">Select a platform or type a custom name below</option>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Facebook" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">URL</label>
                <input name="url" value={form.url} onChange={handleChange} placeholder="https://facebook.com/yourpage" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="rounded border-slate-300 text-[#2f0f6b] focus:ring-[#2f0f6b] dark:border-slate-600 dark:bg-slate-900" />
              Active
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={handleSave} disabled={!form.name || !form.url} className="rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90">Save</button>
            <button onClick={() => { setEditing(null); resetForm(); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3 sm:hidden">
        {paginated.map((link, i) => (
          <LinkCard
            key={link.id}
            link={link}
            onEdit={openEdit}
            onDelete={handleDelete}
            onMove={handleMove}
            isFirst={safePage === 0 && i === 0}
            isLast={safePage === totalPages - 1 && i === paginated.length - 1}
          />
        ))}
        {paginated.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            {search ? 'No links match your search.' : 'No social links yet. Click "New Link" to add one.'}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:block dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Icon</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">URL</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Active</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Order</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((link, i) => (
              <tr key={link.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
                    <SocialIcon icon={link.icon || ''} className="h-4 w-4" />
                  </span>
                </td>
                <td className="max-w-[160px] truncate px-4 py-3 font-medium text-slate-900 dark:text-white">{link.name}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#2f0f6b] transition dark:hover:text-[#a78bfa]">{link.url}</a>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${link.isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-900/30 dark:text-slate-500'}`}>
                    {link.isActive ? '✓' : '✕'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-0.5">
                    <button onClick={() => handleMove(link.id, -1)} disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-slate-300">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <span className="mx-1 font-mono text-xs text-slate-400 dark:text-slate-500">{link.order}</span>
                    <button onClick={() => handleMove(link.id, 1)} disabled={i === links.length - 1} className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-slate-300">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(link)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#2f0f6b]/10 hover:text-[#2f0f6b] dark:hover:bg-[#a78bfa]/10 dark:hover:text-[#a78bfa]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(link.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                  {search ? 'No links match your search.' : 'No social links yet. Click "New Link" to add one.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30">Prev</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} className={`h-8 w-8 rounded-lg text-sm font-medium transition ${i === safePage ? 'bg-[#2f0f6b] text-white dark:bg-[#a78bfa] dark:text-slate-900' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30'}`}>{i + 1}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30">Next</button>
        </div>
      )}
    </section>
  );
}
