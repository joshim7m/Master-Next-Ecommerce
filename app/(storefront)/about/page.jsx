import Link from 'next/link';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf, seoDescription } from '../../../src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const description = seoDescription(settings);
  return {
    title: { absolute: `About Us | ${siteName}` },
    ...(description ? { description } : {}),
    alternates: { canonical: '/about' },
  };
}

const fallbackAbout = (siteName) => `Welcome to ${siteName} — your online store in Bangladesh.

## Get in Touch

Have questions or need help with an order? Visit our contact page or reach out to us directly.`;

const fallbackAboutBn = (siteName) => `${siteName} — আপনার অনলাইন স্টোর বাংলাদেশে।

## যোগাযোগ করুন

প্রশ্ন আছে বা অর্ডার নিয়ে সাহায্য দরকার? আমাদের যোগাযোগ পৃষ্ঠায় যান বা সরাসরি আমাদের সাথে যোগাযোগ করুন।`;

function renderAbout(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`}>{listItems.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(li) }} />)}</ul>
      );
      listItems = [];
    }
  };

  const formatInline = (t) =>
    t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
     .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); return; }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={`h2-${i}`}>{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
    } else {
      flushList();
      elements.push(<p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />);
    }
  });
  flushList();
  return elements;
}

export default async function AboutPage({ searchParams }) {
  const settings = await getSiteSettings();
  const params = await searchParams;
  const lang = params?.lang === 'bn' ? 'bn' : 'en';
  const siteName = siteNameOf(settings);

  const aboutEn = settings.aboutCompany || fallbackAbout(siteName);
  const aboutBn = settings.aboutCompanyBn || fallbackAboutBn(siteName);
  const aboutText = lang === 'bn' ? aboutBn : aboutEn;

  return (
    <div className="mx-auto max-w-4xl px-2 py-12 sm:px-4 lg:px-8 sm:py-16">
      <nav className="mb-8 flex items-center gap-2 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#2f0f6b] dark:hover:text-[#a78bfa] transition-colors">Home</Link>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-slate-600 dark:text-slate-300">{lang === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">{lang === 'bn' ? `${siteName} সম্পর্কে` : `About ${siteName}`}</h1>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <Link href="/about" className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>English</Link>
          <Link href="/about?lang=bn" className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${lang === 'bn' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>বাংলা</Link>
        </div>
      </div>

      <div className="prose prose-slate mt-8 max-w-none prose-headings:text-slate-900 prose-a:text-[#2f0f6b] prose-p:leading-relaxed sm:prose-lg dark:prose-invert dark:prose-headings:text-white dark:prose-a:text-[#a78bfa]">
        {renderAbout(aboutText)}
      </div>
    </div>
  );
}
