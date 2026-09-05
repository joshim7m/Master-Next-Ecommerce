const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'catalogData.json');

const bnMap = {
  'sexy': 'সেক্সি', 'lingerie': 'লিঙ্গারি', 'lace': 'লেস', 'women': 'মহিলাদের',
  'women\'s': 'মহিলাদের', 'nightgown': 'নাইটগাউন', 'nightdress': 'নাইটড্রেস',
  'nightwear': 'নাইটওয়্যার', 'pajamas': 'পাজামা', 'pajama': 'পাজামা',
  'bra': 'ব্রা', 'bikini': 'বিকিনি', 'stockings': 'স্টকিং', 'stocking': 'স্টকিং',
  'panty': 'প্যান্টি', 'panties': 'প্যান্টি', 'thong': 'থং',
  'bodysuit': 'বডিসুট', 'body suit': 'বডিসুট', 'camisole': 'ক্যামিসোল',
  'dress': 'ড্রেস', 'skirt': 'স্কার্ট', 'top': 'টপ', 'halter': 'হ্যাল্টার',
  'mesh': 'মেশ', 'see-through': 'সি-থ্রু', 'transparent': 'স্বচ্ছ',
  'see through': 'সি-থ্রু', 'sheer': 'শিয়ার', 'hollow': 'হোলো',
  'backless': 'ব্যাকলেস', 'strap': 'স্ট্র্যাপ', 'strappy': 'স্ট্র্যাপি',
  'push-up': 'পুশ-আপ', 'push up': 'পুশ-আপ', 'underwire': 'আন্ডারওয়্যার',
  'embroidery': 'এমব্রয়ারি', 'floral': 'ফ্লোরাল', 'flower': 'ফুল',
  'heart': 'হৃদয়', 'butterfly': 'প্রজাপতি', 'leopard': 'চিতাবাঘ',
  'print': 'প্রিন্ট', 'satin': 'সাটিন', 'silk': 'সিল্ক', 'cotton': 'কটন',
  'set': 'সেট', 'three-piece': 'তিন পিস', 'three piece': 'তিন পিস',
  'two-piece': 'দুই পিস', 'two piece': 'দুই পিস', 'one-piece': 'ওয়ান পিস',
  'one piece': 'ওয়ান পিস', 'piece': 'পিস', 'pcs': 'পিস',
  'sexy': 'সেক্সি', 'hot': 'হট', 'passion': 'প্যাশন', 'desire': 'ডিজায়ার',
  'pure': 'পিউর', 'temptation': 'টেম্পটেশন', 'seductive': 'সেডাক্টিভ',
  'erotic': 'ইরোটিক', 'provocative': 'প্রোভোকেটিভ',
  'european': 'ইউরোপীয়', 'american': 'আমেরিকান', 'french': 'ফরাসি',
  'japanese': 'জাপানি', 'chinese': 'চীনা',
  'harness': 'হারনেস', 'bondage': 'বন্ধন', 'cuffs': 'কাফ', 'handcuffs': 'হ্যান্ডকাফ',
  'collar': 'কলার', 'whip': 'চাবুক', 'gag': 'গ্যাগ',
  'costume': 'পোশাক', 'uniform': 'ইউনিফর্ম', 'maid': 'মেড',
  'cosplay': 'কসপ্লে', 'bunny': 'বানি', 'cat': 'ক্যাট',
  'ears': 'কান', 'tail': 'লেজ', 'mask': 'মাস্ক',
  'eye': 'চোখ', 'face': 'মুখ', 'gauze': 'গজ',
  'suspenders': 'সাসপেন্ডার', 'garter': 'গার্টার',
  'deep v': 'ডিপ ভি', 'v-neck': 'ভি-নেক', 'v neck': 'ভি-নেক',
  'halter': 'হ্যাল্টার', 'neck': 'নেক', 'round': 'রাউন্ড',
  'open': 'ওপেন', 'closed': 'ক্লোজড', 'front': 'সামনে', 'back': 'পিছন',
  'crotch': 'ক্রচ', 'open-crotch': 'ওপেন-ক্রচ', 'crotchless': 'ক্রচলেস',
  'tight': 'টাইট', 'loose': 'লুজ', 'fitted': 'ফিটেড',
  'slim': 'স্লিম', 'slender': 'স্লেন্ডার',
  'large': 'বড়', 'plus size': 'প্লাস সাইজ', 'big': 'বড়',
  'small': 'ছোট', 'medium': 'মিডিয়াম',
  'comfortable': 'আরামদায়ক', 'soft': 'নরম', 'breathable': 'শ্বাসযোগ্য',
  'lightweight': 'হালকা', 'smooth': 'মসৃণ',
  'red': 'লাল', 'black': 'কালো', 'white': 'সাদা', 'pink': 'গোলাপি',
  'blue': 'নীল', 'green': 'সবুজ', 'purple': 'বেগুনি', 'gold': 'সোনালি',
  'silver': 'রূপালি', 'pink': 'গোলাপি', 'rose': 'গোলাপি',
  'pearl': 'মুক্তা', 'crystal': 'ক্রিস্টাল', 'bead': 'মণি',
  'bow': 'রিবন', 'ribbon': 'রিবন', 'knot': 'গিঁট',
  'sleepwear': 'স্লিপওয়্যার', 'loungewear': 'লাউঞ্জওয়্যার',
  'underwear': 'আন্ডারওয়্যার', 'intimates': 'ইনটিমেটস',
  'babydoll': 'বেবিডল', 'chemise': 'কেমিজ', 'negligee': 'নেজলিজি',
  'robe': 'রোব', 'kimono': 'কিমোনো', 'wrap': 'র‍্যাপ',
  'chain': 'চেইন', 'ring': 'রিং', 'metal': 'মেটাল',
  'steel': 'স্টিল', 'steel ring': 'স্টিল রিং',
  'wire': 'তার', 'wireless': 'ওয়্যারলেস',
  'pad': 'প্যাড', 'padded': 'প্যাডেড', 'padding': 'প্যাডিং',
  'padding': 'প্যাডিং', 'chest': 'বুক',
  'hip': 'পেল্বিস', 'butt': 'পৃষ্ঠ', 'waist': 'কোমর',
  'thigh': 'য়াং', 'knee': 'হাঁটু', 'ankle': 'গোড়ালি',
  'full': 'পূর্ণ', 'half': 'আধা', 'mini': 'মিনি', 'long': 'লম্বা', 'short': 'ছোট',
  'sleeveless': 'হাতাবিহীন', 'sleeve': 'হাতা',
  'with': 'সহ', 'and': 'ও', 'or': 'বা', 'the': '', 'a': '', 'an': '',
  'for': 'এর', 'style': 'স্টাইল', 'fashion': 'ফ্যাশন',
  'trendy': 'ট্রেন্ডি', 'classic': 'ক্লাসিক', 'modern': 'আধুনিক',
  'luxury': 'লাক্সারি', 'premium': 'প্রিমিয়াম', 'elegant': 'ইলিগ্যান্ট',
  'glamorous': 'গ্ল্যামারাস', 'delicate': 'সূক্ষ্ম', 'dainty': 'সুন্দর',
  'embroidered': 'সেলাইকৃত', 'embellished': 'সজ্জিত',
  'ruffle': 'রাফল', 'ruffled': 'রাফলড',
  'plunge': 'প্লাঞ্জ', 'low-cut': 'লো-কাট', 'low cut': 'লো-কাট',
  'wireless': 'তারবিহীন', 'strapless': 'স্ট্র্যাপবিহীน',
  'halter neck': 'হ্যাল্টার নেক',
  'slit': 'স্লিট', 'split': 'স্প্লিট', 'cut out': 'কাট আউট', 'cut-out': 'কাট-আউট',
  'net': 'জাল', 'fishnet': 'ফিশনেট',
  'tulle': 'টুল', 'chiffon': 'শিফন',
  'gradient': 'গ্রেডিয়েন্ট', 'color': 'রঙ', 'colour': 'রঙ',
  'block': 'ব্লক', 'color-block': 'রঙ-ব্লক',
  'new': 'নতুন', 'latest': 'সর্বশেষ', 'original': 'মূল',
  'wholesale': 'পাইকারি', 'retail': 'খুচরা',
  'dropshipping': 'ড্রপশিপিং',
  'couple': 'জুটি', 'couples': 'জুটি',
  'handcuffs and shackles': 'হ্যান্ডকাফ ও শ্যাকেল',
  'shackles': 'শ্যাকেল',
  'garter belt': 'গার্টার বেল্ট', 'belt': 'বেল্ট',
  'suspender': 'সাসপেন্ডার',
  'slip': 'স্লিপ', 'dress': 'ড্রেস',
  'skirt': 'স্কার্ট', 'pants': 'প্যান্ট', 'shorts': 'শর্টস',
  'shirt': 'শার্ট', 'blouse': 'ব্লাউজ',
  'tights': 'টাইটস',
  'heel': 'হিল', 'heels': 'হিলস',
  'wedding': 'বিয়ে', 'bridal': 'ব্রাইডাল', 'bride': 'কনে',
  'party': 'পার্টি', 'evening': 'সন্ধ্যা',
  'casual': 'ক্যাজুয়াল', 'daily': 'দৈনিক',
  'home': 'বাড়ি', 'wear': 'পোশাক',
  'abstinence': 'বিরতি',
  'handcuffs': 'হ্যান্ডকাফ', 'footcuffs': 'ফুটকাফ',
  'bell': 'ঘণ্টা', 'bracelet': 'ব্র্যাসলেট', 'anklet': 'পায়ের ব্র্যাসলেট',
  'foot ring': 'পায়ের আংটি',
  'bodysuit': 'বডিসুট', 'bodice': 'বোডিস',
  'lace-up': 'লেস-আপ', 'lace up': 'লেস-আপ', 'zip': 'জিপ',
  'hook': 'হুক', 'clasp': 'ক্লাস্প',
  'bow': 'রিবন', 'bowknot': 'রিবন গিঁট',
  'spice': 'মসলা', 'wave': 'তরঙ্গ', 'point': 'পয়েন্ট',
  'pure desire': 'পিউর ডিজায়ার',
  'passion free': 'প্যাশন ফ্রি',
  'no-steel ring': 'স্টিল রিহিন',
  'no steel ring': 'স্টিল রিহিন',
  'dropshipping': 'ড্রপশিপিং',
  'deep': 'গভীর', 'v': 'ভি',
  'suspenders': 'সাসপেন্ডার', 'suspend': 'ঝুলানো',
  'exotic': 'বিদেশী', 'romantic': 'রোমান্টিক',
  'passionate': 'আবেগী', 'flirty': 'ফ্লার্টি',
  'shiny': 'উজ্জ্বল', 'sparkling': 'মিটমিট',
  'glitter': 'গ্লিটার', 'velvet': 'ভেলভেট',
  'fur': 'পশম', 'faux fur': 'কৃত্রিম পশম',
  'fleece': 'ফ্লিস', 'microfiber': 'মাইক্রোফাইবার',
  'nylon': 'নাইলন', 'polyester': 'পলিস্টার',
  'spandex': 'স্প্যান্ডেক্স', 'elastane': 'ইলাস্টেন',
  'jersey': 'জার্সি', 'crepe': 'ক্রেপ',
  'organza': 'অরগানজা', 'chiffon': 'শিফন',
  'georgette': 'জর্জেট',
  'handcuffs 2': 'হ্যান্ডকাফ ২',
  's2 stocking': 'এস২ স্টকিং', 'w1 stocking': 'ডাব্লু১ স্টকিং',
  'w26': 'ডাব্লু২৬',
  'sweet': 'মিষ্টি', 'girl': 'মেয়ে', 'girls': 'মেয়েদের',
  'ladies': 'মহিলাদের', 'lady': 'মহিলা',
  'fancy': 'ফ্যান্সি', 'attractive': 'আকর্ষণীয়',
  'push up': 'পুশ আপ', 'underwear set': 'আন্ডারওয়্যার সেট',
  'with': 'সহ', 'without': 'ছাড়া',
};

function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function stripRandomDigits(name) {
  return name.replace(/\s+\d{2,5}\s*$/, '').replace(/\s*-\s*\d{2,5}\s*$/, '').trim();
}

function cleanSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
    .substring(0, 200);
}

function generateDescription(title, categoryName) {
  const clean = title.replace(/\s+/g, ' ').trim();
  const cat = categoryName || '';
  const desc = `${clean}. High-quality product available at Eghuri. `;
  const extras = [];
  if (/bra|panty|bikini|underwear|lingerie|nightgown|nightdress|pajamas|nightwear|sleepwear|loungewear|stocking|thong|bodysuit|camisole/i.test(clean)) {
    extras.push('Available in multiple sizes.');
  }
  extras.push(`Shop online with fast delivery across Bangladesh.`);
  return desc + extras.join(' ');
}

function generateBnDescription(title, categoryName) {
  const words = title.toLowerCase().split(/\s+/);
  const bnParts = [];
  for (const w of words) {
    const clean = w.replace(/[^a-z-]/g, '');
    if (bnMap[clean]) {
      bnParts.push(bnMap[clean]);
    } else if (/^\d+$/.test(clean)) {
      bnParts.push(clean);
    } else {
      bnParts.push(clean);
    }
  }
  const bnTitle = bnParts.filter(Boolean).join(' ');
  const suffix = '। রেডিয়্যান্ট পিকসে অনলাইনে অর্ডার করুন। সারা বাংলাদেশে দ্রুত ডেলিভারি।';
  return `${bnTitle} ${suffix}`;
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

const slugSet = new Set();

data.products = data.products.map((p) => {
  let name = stripRandomDigits(p.name).trim();
  let slug = cleanSlug(name);

  let baseSlug = slug;
  let counter = 2;
  while (slugSet.has(slug)) {
    slug = `${baseSlug}-${counter++}`;
  }
  slugSet.add(slug);

  const catName = data.categories.find(c => {
    if (p.breadcrumbSubName) {
      return c.name === p.breadcrumbSubName || c.subs.some(s => s.name === p.breadcrumbSubName);
    }
    return c.slug === p.breadcrumbCatSlug;
  })?.name || '';

  const description = generateDescription(name, catName);
  const description_bn = generateBnDescription(name, catName);

  return { ...p, name, slug, description, description_bn };
});

data.processedAt = new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

console.log(`✓ Processed ${data.products.length} products`);
console.log(`  - Names cleaned (trailing digits removed)`);
console.log(`  - Slugs regenerated (unique, no URL encoding)`);
console.log(`  - Descriptions added (English + Bangla)`);

let sampleCount = 0;
for (const p of data.products) {
  if (sampleCount >= 3) break;
  console.log(`\n  Sample ${sampleCount + 1}:`);
  console.log(`    Name: ${p.name}`);
  console.log(`    Slug: ${p.slug}`);
  console.log(`    EN: ${p.description.substring(0, 100)}...`);
  console.log(`    BN: ${p.description_bn.substring(0, 100)}...`);
  sampleCount++;
}
