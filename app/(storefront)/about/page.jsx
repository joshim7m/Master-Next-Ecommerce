import Link from 'next/link';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf } from '../../../src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  return {
    title: { absolute: `About Us | ${siteName}` },
    description: `Learn about ${siteName} — Bangladesh's favourite online destination for lingerie, sleepwear, beauty, kitchen essentials, and lifestyle products.`,
    alternates: { canonical: '/about' },
  };
}

const fallbackAbout = (siteName) => `Welcome to ${siteName} — Bangladesh's favourite online destination for lingerie, sleepwear, beauty, kitchen essentials, and lifestyle products.

## Our Mission

We believe every customer deserves access to comfortable, high-quality products that make everyday living better. Our mission is to provide premium products at affordable prices, delivered with care across Bangladesh.

## Why Choose Us

- **Premium Quality:** We carefully select and curate our products to ensure the highest quality materials and craftsmanship.
- **Cash on Delivery:** Shop with confidence with our cash on delivery option available across Bangladesh.
- **Nationwide Shipping:** We deliver to Dhaka, Chittagong, Sylhet, and all areas across Bangladesh.
- **Easy Returns:** Not satisfied? Our hassle-free return policy has you covered.
- **Dedicated Support:** Reach us by phone, WhatsApp, or email — we're here to help.

## Our Story

${siteName} was born from a simple idea: everyone should have access to quality lifestyle products without the hassle of traditional shopping. We started as a small online store and have grown into one of Bangladesh's most trusted e-commerce destinations.

Our team works tirelessly to bring you the latest trends, daily essentials, and everything in between — from lingerie and sleepwear to beauty products and kitchen gadgets.

## Get in Touch

Have questions? We'd love to hear from you. Visit our contact page or reach out to us directly. Your satisfaction is our priority.`;

const fallbackAboutBn = (siteName) => `${siteName} — বাংলাদেশের জনপ্রিয় অনলাইন গন্তব্য লিঞ্জেরি, স্লিপওয়্যার, সৌন্দর্য সামগ্রী, কিচেন এবং লাইফস্টাইল পণ্যের জন্য।

## আমাদের মিশন

আমরা বিশ্বাস করি প্রতিটি গ্রাহক উন্নত মানের আরামদায়ক পণ্যের অধিকারী, যা দৈনন্দিন জীবনকে আরও ভালো করে তোলে। আমাদের লক্ষ্য বাংলাদেশ জুড়ে সেবা প্রদান করা।

## কেন আমাদের বেছে নেবেন

- **মানসম্মত পণ্য:** সর্বোচ্চ মানের উপাদান নিশ্চিত করতে আমরা যত্ন সহকারে পণ্য নির্বাচন করি।
- **ক্যাশ অন ডেলিভারি:** বাংলাদেশ জুড়ে ক্যাশ অন ডেলিভারি।
- **সারা দেশে ডেলিভারি:** ঢাকা, চট্টগ্রাম, সিলেট ও সারা বাংলাদেশে।
- **সহজ রিটার্ন:** অসন্তুষ্ট? আমাদের সহজ রিটার্ন নীতি আছে।
- **সহায়তা:** ফোন, হোয়াটসঅ্যাপ বা ইমেইলে যোগাযোগ করুন।

## আমাদের গল্প

${siteName} একটি সহজ ধারণা থেকে জন্মেছে: সকলেই গুণগত লাইফস্টাইল পণ্যে অ্যাক্সেস পাওয়ার যোগ্য। আমরা ছোট একটি অনলাইন দোকান থেকে শুরু করে বাংলাদেশের অন্যতম বিশ্বস্ত ই-কমার্স গন্তব্যে পরিণত হয়েছি।

## যোগাযোগ করুন

প্রশ্ন আছে? আমরা শুনতে চাই। আমাদের যোগাযোগ পৃষ্ঠা দেখুন। আপনার সন্তুষ্টি আমাদের অগ্রাধিকার।`;

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
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
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
