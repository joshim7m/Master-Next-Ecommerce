Act as a Senior Next.js 16 Developer and Google Tag Manager
(GTM), Meta Pixel, and E-commerce Tracking Expert.

This project
Stack: Next.js 16 (App Router), React, Tailwind CSS.

CURRENT SETUP:
- GTM is initialized once in the root layout.
- Different pages and buttons trigger custom Data Layer events.
- Events are reaching Google Tag Manager.
- However, Meta/Facebook Pixel tracking is not working correctly.
- Next.js uses client-side navigation without full page reloads.

YOUR TASK:

1. Audit the entire existing GTM and Data Layer implementation.

2. Identify and fix tracking bugs, incorrect event handling,
   missing triggers, duplicate events, and initialization issues.

3. Ensure GTM loads only once globally and all events use
   window.dataLayer.push() without resetting the Data Layer.

4. Implement reliable virtual pageview tracking for Next.js
   App Router navigation, including initial page loads.
   Prevent duplicate PageView events.

5. Review and fix these e-commerce tracking events:
   - PageView
   - ViewContent
   - Search
   - AddToCart
   - RemoveFromCart
   - InitiateCheckout
   - AddPaymentInfo
   - Purchase

6. Ensure event payloads contain accurate product IDs,
   prices, quantities, currency (BDT), and order information
   wherever applicable.

7. Ensure Purchase fires only after confirmed successful
   orders and never duplicates.

8. Make Data Layer events compatible with GTM Custom Event
   Triggers and Meta Pixel standard events.

9. Check React Strict Mode, hydration, route changes,
   and client-side rendering issues.

10. If Meta Pixel is configured inside GTM, do not add
    another direct Pixel installation. Prevent duplicate tracking.

IMPORTANT:
- Inspect existing code before making changes.
- Reuse existing tracking utilities where possible.
- Preserve current event naming or document required mappings.
- Do not modify website UI, styling, or business logic.
- Do not introduce unnecessary dependencies.
- Fix issues directly in the project files.
- Run available build, lint, and relevant tests.
- Explain any GTM or Meta dashboard configuration that
  cannot be fixed from the codebase.

FINAL OUTPUT:
- Issues found
- Files modified
- Fixes implemented
- Remaining GTM/Meta configuration steps
- Exact testing instructions using GTM Preview
  and Meta Events Manager Test Events

Goal: Reliable, accurate, and duplicate-free
GTM Data Layer and Meta Pixel tracking.