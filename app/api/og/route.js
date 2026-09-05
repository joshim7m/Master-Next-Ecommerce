import { ImageResponse } from 'next/og';
import { DEFAULT_BRAND } from '../../../src/lib/siteSettings';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteUrlOf } from '../../../src/lib/siteSettings';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const settings = await getSiteSettings();
  const title = searchParams.get('title') || DEFAULT_BRAND;
  const subtitle = searchParams.get('subtitle') || "Bangladesh's Trusted Online Lingerie & Women's Intimates Store";
  const brand = searchParams.get('siteName') || DEFAULT_BRAND;
  const siteHost = new URL(siteUrlOf(settings)).hostname;
  const type = searchParams.get('type') || 'website'; // website | product | category
  const price = searchParams.get('price') || '';

  const bgColor = type === 'product' ? '#faf5ff' : '#f8fafc';
  const accentColor = '#6d28d9';
  const tagColor = type === 'product' ? '#7c3aed' : type === 'category' ? '#2563eb' : '#6d28d9';

  const tagLabel = type === 'product' ? 'PRODUCT' : type === 'category' ? 'CATEGORY' : 'SHOP NOW';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: bgColor,
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient blob */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #ec489915 0%, transparent 70%)',
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 60px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontSize: '22px', fontWeight: '800' }}>{brand.charAt(0).toUpperCase()}</span>
            </div>
            <span style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>
              {brand}
            </span>
          </div>
          <div
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              backgroundColor: tagColor,
              color: 'white',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '1px',
            }}
          >
            {tagLabel}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0 60px',
            flex: 1,
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <h1
            style={{
              fontSize: title.length > 60 ? '40px' : title.length > 40 ? '48px' : '56px',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: '1.15',
              margin: 0,
              maxWidth: '900px',
              textWrap: 'wrap',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: '22px',
              color: '#64748b',
              margin: 0,
              maxWidth: '800px',
              lineHeight: '1.4',
            }}
          >
            {subtitle}
          </p>
          {price && (
            <p
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: accentColor,
                margin: '8px 0 0',
              }}
            >
              ৳{price}
            </p>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 60px 40px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#94a3b8' }}>
            {siteHost}
          </span>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>
            Cash on Delivery • Nationwide Shipping
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
