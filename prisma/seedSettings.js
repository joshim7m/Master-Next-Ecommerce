const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const startTime = Date.now();
  console.log('=== Seed Start ===\n');

  // 1. Users
  console.log('Seeding users…');
  const hash = await bcrypt.hash('histacin', 12);
  
  await prisma.user.upsert({
    where: { email: 'joshimfv@gmail.com' },
    update: { passwordHash: hash, role: 'admin' },
    create: { name: 'Joshim', email: 'joshimfv@gmail.com', passwordHash: hash, role: 'admin' },
  });
  console.log('  ✓ Admin user');

  // 2. Site settings
  console.log('\nSeeding site settings…');
  await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {
      siteName: 'Eghuri',
      logo: '/uploads/settings/eghuri-logo.png',
      favicon: '/uploads/settings/eghuri-favicon.png',
      mobile: '01XXXXXXXXX',
      email: 'hello@eghuri.com',
      address: 'Dhaka, Bangladesh',
      copyrightText: '@ 2025 Eghuri. All rights reserved.',
      announcementText: 'Call or WhatsApp: 01XXXXXXXXX',
      aboutCompany: `Welcome to Eghuri, your trusted online hub for premium lifestyle products in Bangladesh. We bring you a curated collection of modern apparel, comfortable sleepwear, premium lingerie, stylish footwear, beauty essentials, and smart home gadgets.`,
      aboutCompanyBn: `এঘুরি (Eghuri)-তে আপনাকে স্বাগতম—যা বাংলাদেশে প্রিমিয়াম লাইফস্টাইল পণ্য কেনাকাটার একটি নির্ভরযোগ্য অনলাইন মাধ্যম। আমরা নিয়ে এসেছি আধুনিক পোশাক, আরামদায়ক স্লিপওয়্যার, এক্সক্লুসিভ লিঞ্জেরি, ট্রেন্ডি জুতো, রূপচর্চার সামগ্রী এবং স্মার্ট কিচেন ও হোম গ্যাজেটসের চমৎকার কালেকশন।`,
    },
    create: {
      id: 'singleton',
      siteName: 'Eghuri',
      logo: '/uploads/settings/eghuri-logo.png',
      favicon: '/uploads/settings/eghuri-favicon.png',
      mobile: '01XXXXXXXXX',
      email: 'hello@eghuri.com',
      address: 'Dhaka, Bangladesh',
      copyrightText: '@ 2025 Eghuri. All rights reserved.',
      announcementText: 'Call or WhatsApp: 01XXXXXXXXX',
      aboutCompany: `Welcome to Eghuri, your trusted online hub for premium lifestyle products in Bangladesh. We bring you a curated collection of modern apparel, comfortable sleepwear, premium lingerie, stylish footwear, beauty essentials, and smart home gadgets.`,
      aboutCompanyBn: `এঘুরি (Eghuri)-তে আপনাকে স্বাগতম—যা বাংলাদেশে প্রিমিয়াম লাইফস্টাইল পণ্য কেনাকাটার একটি নির্ভরযোগ্য অনলাইন মাধ্যম। আমরা নিয়ে এসেছি আধুনিক পোশাক, আরামদায়ক স্লিপওয়্যার, এক্সক্লুসিভ লিঞ্জেরি, ট্রেন্ডি জুতো, রূপচর্চার সামগ্রী এবং স্মার্ট কিচেন ও হোম গ্যাজেটসের চমৎকার কালেকশন।`,
    },
  });
  console.log('  ✓ Site settings');

  // 3. Hero sliders
  console.log('\nSeeding hero sliders…');
  const heroSlides = [
    { title: "Comfortable Women's Sleepwear & Nightwear", subtitle: 'Soft, cozy sleepwear sets designed for ultimate comfort — shop dresses, shorts & loungewear', buttonText: 'Shop Sleepwear', buttonLink: '/products', image: 'https://picsum.photos/seed/sleepwear1/1400/500', order: 0 },
    { title: 'Premium Lingerie & Intimates Collection', subtitle: 'Elegant bra sets, stockings & lingerie — find your perfect fit with fast delivery in Bangladesh', buttonText: 'Explore Lingerie', buttonLink: '/products', image: 'https://picsum.photos/seed/lingerie1/1400/500', order: 1 },
    { title: 'Beauty & Personal Care Essentials', subtitle: 'Skincare, haircare & grooming products to elevate your daily self-care routine', buttonText: 'Shop Beauty', buttonLink: '/products', image: 'https://picsum.photos/seed/beauty1/1400/500', order: 2 },
    { title: 'Kitchen & Dining Must-Haves', subtitle: 'Quality cookware, utensils & dining accessories for every modern home', buttonText: 'Shop Kitchen', buttonLink: '/products', image: 'https://picsum.photos/seed/kitchen1/1400/500', order: 3 },
    { title: 'Trendy Fashion & Lifestyle Picks', subtitle: 'Stay ahead with curated fashion accessories & lifestyle products at affordable prices', buttonText: 'Explore Fashion', buttonLink: '/products', image: 'https://picsum.photos/seed/fashion1/1400/500', order: 4 },
  ];
  for (const slide of heroSlides) {
    await prisma.heroSlider.create({ data: slide });
  }
  console.log(`  ✓ ${heroSlides.length} slides`);

  // 4. Social links
  console.log('\nSeeding social links…');
  const socialLinks = [
    { name: 'Facebook', url: 'https://facebook.com/eghuri', icon: 'facebook', order: 0 },
    { name: 'Instagram', url: 'https://instagram.com/eghuri', icon: 'instagram', order: 1 },
    { name: 'YouTube', url: 'https://youtube.com/@eghuri', icon: 'youtube', order: 2 },
  ];
  for (const link of socialLinks) {
    await prisma.socialLink.create({ data: link });
  }
  console.log(`  ✓ ${socialLinks.length} social links`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Seed complete in ${elapsed}s ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());