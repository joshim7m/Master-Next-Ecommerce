# Revised Plan — Admin Dashboard: Orders by Day & Hour + Product of the Month

Status: Implemented — 2026-10-07 revision: Saturday-first week window (Sat…Fri containing today) resolved and shipped in `getOrdersByHourLast7Days` / `HourlyOrdersChart`.

Project:
Existing Next.js admin dashboard

Primary stack:
- Next.js
- React 19
- Chart.js
- react-chartjs-2
- Prisma
- PostgreSQL

==================================================
1. OBJECTIVE
==================================================

Update `/admin/dashboard` with:

1. "Orders by Day & Hour" Chart.js visualization
2. "Product of the Month"
3. Four operational stat cards:
   - Today's Orders
   - Pending Orders
   - Incomplete Orders
   - Revenue
4. Deep links from the stat cards to the relevant admin pages.

IMPORTANT:

The chart must NOT use order count as either the main horizontal category axis or the vertical time axis.

The required chart orientation is:

VERTICAL Y-AXIS:
Time of day
8:00 AM → 12:00 AM

HORIZONTAL X-AXIS:
7 days, in Bangladesh week order
Sat, Sun, Mon, Tue, Wed, Thu, Fri

The product owner has explicitly chosen a fixed Saturday-first calendar view
(Bangladesh's week starts on Saturday), so the labels must always read
Sat, Sun, Mon, Tue, Wed, Thu, Fri — never a rolling "today + previous six"
order.

Conceptually:

12 AM |        ▓       ▓
11 PM |    ▓   ▓       ▓
10 PM |    ▓           ▓
 9 PM |        ▓   ▓
 8 PM |    ▓   ▓
 ...   |
 9 AM | ▓      ▓
 8 AM | ▓  ▓   ▓
      +-----------------------------
        Sat Sun Mon Tue Wed Thu Fri

X = DAYS
Y = TIME

This requirement is mandatory.

==================================================
2. IMPORTANT CHART ARCHITECTURE CHANGE
==================================================

Do NOT use:

indexAxis: 'y'

with:

labels = hourly labels
datasets = days

That produces:

Y = hours
X = numeric order count

which is NOT the desired chart.

Instead, create a VERTICAL FLOATING BAR / HOURLY BLOCK chart using Chart.js Bar.

Each visible bar/block represents one:

(day, hour)

combination.

The X position is the weekday.

The Y range of the block represents the hour interval.

Example:

Monday 3 PM bucket:

x = "Mon"
y = [15, 16]

Monday 4 PM:

x = "Mon"
y = [16, 17]

etc.

This means Chart.js's numeric Y axis represents clock time.

The horizontal X axis remains the weekday categories.

==================================================
3. CHART DATA MODEL
==================================================

Server action should return clean normalized data.

Recommended structure:

{
  days: [
    {
      label: "Sat",
      date: "2026-10-03",
      hours: [
        { hour: 8, count: 1 },
        { hour: 9, count: 0 },
        { hour: 10, count: 3 },
        ...
        { hour: 23, count: 2 }
      ]
    },
    ...
  ],
  total: 123
}

There must be:

7 days

and each day must contain exactly:

16 hourly buckets

representing:

08:00–08:59
09:00–09:59
10:00–10:59
...
23:00–23:59

Midnight is the END boundary at numeric Y value 24.

Do not create a separate 12 AM order bucket.

Therefore:

8 AM = 8
9 AM = 9
...
12 PM = 12
...
11 PM = 23
12 AM boundary = 24

==================================================
4. CHART.JS FLOATING BAR FORMAT
==================================================

Transform the normalized server data into Chart.js floating bars.

Conceptually:

{
  x: "Mon",
  y: [15, 16],
  count: 4,
  hourLabel: "3:00 PM"
}

Chart.js supports floating bars using:

y: [startValue, endValue]

Example:

{
  x: "Mon",
  y: [15, 16]
}

This produces a vertical block occupying the 3 PM–4 PM interval.

Create one dataset for each hourly interval OR another clean Chart.js-compatible implementation that preserves:

X = day
Y = time

Do not create a numeric order-count X axis.

==================================================
5. REPRESENTING ORDER VOLUME
==================================================

The Y position and height must represent TIME ONLY.

Do NOT increase bar height based on order count because that would distort the clock axis.

Instead, order count should control visual emphasis.

Recommended behavior:

count = 0
→ do not draw a block, or render almost transparent

count = 1
→ light accent block

count = medium
→ stronger accent

count = high
→ strongest accent

Use the existing purple dashboard accent.

Calculate intensity relative to the maximum count in the current seven-day dataset.

For example:

const intensity = maxCount > 0
  ? count / maxCount
  : 0;

Use intensity to calculate a reasonable alpha value.

Do not introduce unrelated colors.

The visualization should effectively behave like a bar-based hourly heat map.

==================================================
6. OPTIONAL COUNT LABELS
==================================================

Do not clutter every block with text by default.

Tooltip is the main detailed interaction.

If there is enough space, a very small count can optionally be drawn inside high-volume blocks.

This is optional.

Do NOT add another dependency just for labels unless absolutely necessary.

==================================================
7. TOOLTIP
==================================================

Hovering a block must show:

Monday
3:00 PM – 4:00 PM
Orders: 4

or similar.

Use the actual full weekday/date when useful:

Monday · Oct 5
3:00 PM – 4:00 PM
Orders: 4

Tooltip must read the custom `count` field rather than interpreting:

y: [15, 16]

as the order quantity.

==================================================
8. Y-AXIS CONFIGURATION
==================================================

Y-axis is numeric.

Required:

min: 8
max: 24

Use:

stepSize: 1

Convert numeric tick values into human-readable time.

Examples:

8  -> "8 AM"
9  -> "9 AM"
10 -> "10 AM"
11 -> "11 AM"
12 -> "12 PM"
13 -> "1 PM"
14 -> "2 PM"
15 -> "3 PM"
16 -> "4 PM"
17 -> "5 PM"
18 -> "6 PM"
19 -> "7 PM"
20 -> "8 PM"
21 -> "9 PM"
22 -> "10 PM"
23 -> "11 PM"
24 -> "12 AM"

The chart must visually start with:

8 AM at the bottom

and end with:

12 AM at the top.

Do NOT reverse this axis.

==================================================
9. X-AXIS CONFIGURATION
==================================================

The X-axis must contain exactly seven day labels:

Sat
Sun
Mon
Tue
Wed
Thu
Fri

RESOLVED (product owner decision): Saturday-first is mandatory.

The earlier draft said "do NOT blindly hardcode Saturday as the first day" and
preferred chronological oldest → newest. The product owner has since overridden
that: the chart must always start at Saturday, because Bangladesh's week starts
on Saturday. Treat the seven columns as the current Sat→Fri calendar week (see
§11), returned in that exact order from the server. The client must render the
labels in the order the server sends them — no re-sorting, no wrapping.

Per §11, the window is the Sat→Fri week *containing today*, so unlike the
"oldest → newest" draft the labels are never a rolling sequence to the left of
today; they are the fixed week layout with today somewhere inside it.

==================================================
10. TIMEZONE
==================================================

All order bucketing must use Bangladesh time.

Preferred timezone:

Asia/Dhaka

Bangladesh is UTC+6 and currently has no daylight-saving transition.

Existing Prisma `createdAt` values are UTC timestamps.

Every timestamp must be converted to Bangladesh business time BEFORE:

- determining calendar date
- determining weekday
- determining hour
- calculating today's boundary
- calculating month boundaries

Do not depend on the browser's timezone.

Keep the conversion in the server/data layer.

==================================================
11. SEVEN-DAY WINDOW
==================================================

RESOLVED (product owner decision): the window is the current Sat→Fri week.

The window is the Bangladesh calendar week that *contains today*, starting on
Saturday (BD weeks run Saturday through Friday). Concretely:

start = 00:00 BD on the most recent Saturday on-or-before today
end   = 00:00 BD on the following Saturday (exclusive bound for the query)

Everything inside — the weekday labels, the per-day order of the columns —
comes straight off that start date, so the first column is always Saturday and
the labels always read Sat … Fri. Today's column is always on screen and is
partial after 12 AM; the days still to come in the week render as empty
columns (they can only contain zero buckets, since no orders exist in the
future). The caption must say "this week" / "Sat – Fri", never "last 7 days",
because the window is a calendar week, not a trailing 7-day span.

Example (BD now 2026-10-07, a Wednesday):

Window columns:

Sat 2026-10-03
Sun 2026-10-04
Mon 2026-10-05
Tue 2026-10-06
Wed 2026-10-07  (today, partial)
Thu 2026-10-08  (empty)
Fri 2026-10-09  (empty)

Only order events whose BD hour is 08:00–23:59 should be plotted.

Do not mix the Sat→Fri week with a trailing "today + previous six days"
window — the two disagree everywhere except on Fridays.

==================================================
12. SERVER ACTION
==================================================

File:

src/actions/orders.js

Create or revise:

getOrdersByHourLast7Days()

Responsibilities:

1. Determine Bangladesh calendar boundaries.
2. Query only necessary orders.
3. Exclude `incomplete` orders if that is the established dashboard definition.
4. Convert each `createdAt` into Bangladesh time.
5. Determine:
   - Bangladesh date
   - weekday
   - Bangladesh hour
6. Ignore orders before 08:00.
7. Bucket valid orders from hour 8 through 23.
8. Return seven days × sixteen hourly buckets.
9. Pre-fill every bucket with zero.

Do not silently move 1 AM, 4 AM, etc. into the 8 AM bucket.

They must be excluded from this chart.

==================================================
13. HELPER FUNCTIONS
==================================================

Keep timezone handling in reusable server-side helpers.

Possible helpers:

bdParts(date)
bdMidnightUtc(date)
formatHourLabel(hour)
getBangladeshDateKey(date)

If the existing project intentionally uses a fixed +6 hour method, it can remain because Bangladesh does not use DST.

But keep all timezone calculations in one logical area and avoid duplicating inconsistent date arithmetic.

==================================================
14. CHART COMPONENT
==================================================

File:

src/components/admin/HourlyOrdersChart.jsx

or:

src/components/admin/OrdersByDayHourChart.jsx

Use:

"use client";

Imports:

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip
} from "chart.js";

import { Bar } from "react-chartjs-2";

Register only the components needed.

Do not install or use Recharts, ApexCharts, ECharts, Nivo, etc.

==================================================
15. SSR / NEXT.JS
==================================================

The component must work correctly with Next.js App Router.

If the existing Chart.js component already renders correctly without a mounted guard, do not add unnecessary complexity.

If hydration/canvas errors occur, use either:

- mounted state with useEffect

or

- dynamic import with ssr: false

Choose the cleanest approach consistent with the existing codebase.

Do not add both unless necessary.

==================================================
16. RESPONSIVE CHART
==================================================

Use:

responsive: true
maintainAspectRatio: false

The chart container needs an explicit responsive height.

Example:

desktop:
~360–420px

mobile:
~420–520px if needed for readable hourly ticks

The chart must:

- stay inside the dashboard card
- not overflow horizontally
- keep all seven day names visible
- keep hourly labels readable
- work in dark and light dashboard themes if the project supports both

==================================================
17. VISUAL STYLE
==================================================

Preserve the existing admin dashboard style.

Existing direction:

- dark navy card
- subtle border
- rounded corners
- white/near-white heading
- muted secondary text
- purple accent
- subtle grid lines

Do not redesign the dashboard.

Only improve the visualization.

Use theme values from the existing ThemeProvider where possible.

Avoid hardcoded colors if theme tokens already exist.

==================================================
18. CHART HEADER
==================================================

Title:

Orders by Day & Hour

Subtitle:

8:00 AM – 12:00 AM · Sat – Fri week (Bangladesh time)

Do not use an ambiguous caption ("last 7 days" is wrong now: the window is a
calendar week, not a trailing 7-day span — see §11).

The badge shows the week's order total:

123 this week

==================================================
19. EMPTY STATE
==================================================

If all 112 buckets are zero:

Do not render a meaningless blank Chart.js graph.

Show a clean empty state inside the same chart card:

"No orders between 8:00 AM and 12:00 AM during this period."

Keep the card header visible.

==================================================
20. PRODUCT OF THE MONTH
==================================================

Keep the existing Product of the Month plan.

Rank products by:

total units sold

Display:

- rank
- image
- product title
- variant if available
- units sold
- revenue

Use Bangladesh current-month boundaries.

Exclude statuses according to the existing sales/revenue business rules:

cancelled
return
incomplete

if that matches the existing implementation.

Revenue must calculate:

unit price × quantity

not merely sum unit prices.

Grouping should use SKU where available.

If SKU is null, use the existing safe fallback.

==================================================
21. DASHBOARD STATS
==================================================

Keep the four dashboard cards:

Today's Orders
Pending Orders
Incomplete Orders
Revenue

Today's Orders:
Bangladesh midnight → now

Pending Orders:
status = pending

Incomplete Orders:
status = incomplete

Revenue:
preserve the established valid-sales status logic.

==================================================
22. CARD LINKS
==================================================

Today's Orders:
 /admin/orders

Pending Orders:
 /admin/orders?status=pending

Incomplete Orders:
 /admin/incomplete-orders

Revenue:
 /admin/reports/sales

Do not claim Today's Orders is date-filtered unless the orders page actually supports a date parameter.

==================================================
23. ORDERS PAGE STATUS PARAM
==================================================

Ensure:

/admin/orders?status=pending

actually initializes the status filter as "pending".

Inspect the existing page before changing it.

If it already uses search params correctly, make no change.

If not, implement the smallest safe fix.

Do not unnecessarily refactor the page.

==================================================
24. EXPECTED FILES
==================================================

Likely files:

1. package.json / lockfile
   - only if Chart.js dependencies are not already installed

2. src/actions/orders.js
   - Bangladesh date helpers
   - getOrdersByHourLast7Days
   - top product query
   - dashboard stats

3. src/components/admin/HourlyOrdersChart.jsx
   - floating vertical Chart.js bars
   - X = weekdays
   - Y = clock time

4. src/components/admin/TopProductsMonth.jsx
   - Product of the Month

5. app/admin/dashboard/page.jsx
   - chart + Product of the Month + stats

6. app/admin/orders/page.jsx
   - only if ?status= currently does not work

Do not create files unnecessarily.

==================================================
25. NO DATABASE MIGRATION
==================================================

Do not modify the Prisma schema unless inspection proves the existing columns cannot support the feature.

This feature should normally require:

NO Prisma schema change
NO migration

because it derives values from existing order timestamps and order items.

==================================================
26. BEFORE MAKING CHANGES
==================================================

First inspect the project.

Report briefly:

1. Current dashboard file
2. Current chart component
3. Current Chart.js setup
4. Current orders server action
5. Current order schema/types
6. Current status filter implementation
7. Chart.js/react-chartjs-2 installed versions

Then explicitly identify the existing chart problem.

The expected problem is likely:

"The current implementation maps order count onto the horizontal scale instead of putting the seven weekdays on the X-axis."

Do not start by rewriting unrelated files.

==================================================
27. IMPLEMENTATION RULES
==================================================

- Modify the existing implementation.
- Keep existing project conventions.
- Use TypeScript if the surrounding code uses TypeScript.
- If the existing files are JSX/JS, do not convert the whole feature to TypeScript without a reason.
- Avoid unnecessary dependencies.
- No fake production data.
- Preserve existing Prisma fetching patterns.
- Preserve existing dashboard theme.
- Do not break unrelated dashboard functionality.
- Run lint/build/type-check after editing.

==================================================
28. ACCEPTANCE TESTS
==================================================

The task is complete only if all of these are true:

[ ] Bottom axis contains seven weekday labels.

[ ] Bottom axis does NOT show:
    0, 1, 2, 3...
    as order-count categories.

[ ] Left vertical axis starts at 8 AM.

[ ] Left vertical axis ends at 12 AM.

[ ] An order at Monday 3:20 PM appears:
    under Monday
    between 3 PM and 4 PM.

[ ] An order at Monday 7:30 AM does NOT appear.

[ ] Multiple Monday 3 PM orders increase visual intensity/count
    without moving the block away from the 3 PM slot.

[ ] Tooltip shows the correct order count.

[ ] Bangladesh timezone is used.

[ ] Bottom axis labels read exactly:
    Sat, Sun, Mon, Tue, Wed, Thu, Fri — in that order,
    as the Sat→Fri calendar week containing today (BD).
    (Checked 2026-10-07: Sat 03 … Fri 09, today in the middle, Thu/Fri empty.)

[ ] Zero-count buckets do not distort axes.

[ ] Mobile layout remains usable.

[ ] Existing dashboard styling remains intact.

[ ] npm build succeeds.

==================================================
29. FINAL REPORT
==================================================

After implementing, respond with:

1. Files changed
2. Root cause of the original chart problem
3. New Chart.js approach
4. Exact seven-day range behavior
5. Bangladesh timezone handling
6. How order volume is represented
7. Any dependency changes
8. Build/lint result

Do not only provide example code.

Actually edit the project.