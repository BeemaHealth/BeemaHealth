# Bask portal recon

**Date:** 8/15/2026

Recon of Bask's merchant/admin portal (not Hive patient login). No patient-level data was transcribed.

## 1. Navigation

| Screen | Description |
|--------|-------------|
| Home | Store-wide overview dashboard (revenue, orders, live summary, current-vs-previous period comparison) |
| Patients | Patient roster / record management (PHI) |
| Treatments | Submenu: Treatments (patient treatment/consult records, PHI), Configs (treatment-type config, e.g. weight-loss goals settings) |
| Orders | Submenu: Orders (order list + aggregate stats), Upcoming (auto-orders/subscription renewals), Payments (transactions, Subscriptions, Subscription Invoices), Disputes (chargebacks), Resolution Queue (fulfillment issue queue) |
| Messenger | Patient-provider messaging inbox (PHI) |
| Analytics | Submenu: Dashboard, Live View, Marketing, Reports, Cohorts, SLA Performance, Export History, BaskQL - main reporting hub, detailed below |
| Questionnaires | Manage intake/questionnaire form templates; shows aggregate session/question counts |
| Notifications | Submenu: Workflows, Templates, Email Templates - automation config, not reporting |
| Products | Submenu: Products, Billing plans, Replacement Mapping, Routing, Data Templates, Treatment Plans - catalog/config |
| Builders | Submenu: Landing Pages, Theme Builder - marketing site builder tools |
| Finances | Submenu: Billing (Bask platform invoices), Financing, Payouts (bank payout history), Refund Insights (refund reporting) |
| Discounts | Submenu: Codes, Insights (coupon usage reporting) |
| Store Credit | Submenu: Insights (store-credit usage reporting, not fully inspected) |
| Affiliates | Affiliate program management/tracking (unused currently) |
| Settings | Org configuration incl. Webhook & API, Apps & Integrations, Users & Permissions, Access Control, Custom Statuses, etc. |

## 2. Reporting screens

| Screen | Path | Metrics | Date range |
|--------|------|---------|------------|
| Home Dashboard | Home | Total Sales, Total Expenses, Gross Profit, Total Orders, revenue chart, Live Summary, Net Revenue, New Patients chart | Yes (range + automatic current-vs-previous-period comparison) |
| Analytics Dashboard | Analytics > Dashboard | Total Revenue, Total Sales, Total Expenses, Avg Order Value, Orders Processed, Orders Over Time, Revenue Breakdown, New Patients (weekly), Sessions by device, Online conversion rate, Payments Breakdown, Patients retention rate | Yes (range + comparison dropdown + customizable widgets) |
| Live View | Analytics > Live View | Active cart/Checking out/Purchased, Visitors right now, Total sales/sessions/orders, Sessions by location, New vs Returning customers, Sales by product | No (real-time snapshot only) |
| Marketing Performance | Analytics > Marketing | Revenue, Most profitable channels, Spending, Sessions, Most converting campaigns, CAC, LTV, Top Patients (PHI), Product Performance, and a 5-step CRO funnel (Questionnaire started -> Patient sign-ups -> Checkout submitted -> Doctor visit -> Order fulfilled) with counts/drop-off/best campaign per step | Yes (range + channel filter) |
| Reports | Analytics > Reports | 5 tabs: Time Metrics (stage-to-stage avg time, flagged "premium, still in development"), Retention (by Orders/Revenue), Aggregates (by State/Pharmacy/Variant), Segments (patient segment counts + Export button, also flagged in development), Pharmacy (orders sent/shipped/unshipped) | Yes (range + treatment filter) |
| Cohorts | Analytics > Cohorts | Monthly retention-cohort table/chart, tabs Retention/Repurchase/LTV | Yes (period + treatment/product filters) |
| SLA Performance | Analytics > SLA Performance | No SLA rules configured yet - screen is empty until rules are set up | N/A |
| Export History | Analytics > Export History | Locked behind inactive paid "Data Exports" add-on | N/A |
| BaskQL | Analytics > BaskQL | Custom SQL query builder against internal tables; built-in templates: "Daily revenue & refund trend," "Questionnaire completion funnel," "Avg fulfillment time by state," "Patient signup-to-first-order funnel," "Top products by active subscriptions," "Attribution -> conversion by UTM," plus two patient-list templates ("Patients due for check-in/follow-up") | Depends on query written |
| Orders list | Orders | Header stats: Total orders, Refunded, Fulfilled orders, Unfulfilled orders, Avg. Time to fulfill | Yes (range) |
| Refund Insights | Finances > Refund Insights | Total refunds/amount, Refunds over time, Refunds per user, High refund members, Refunds by product, Refunds reason analysis (breakdown by reason) | Partial (year selector, monthly grouping - not a full range picker) |
| Coupon Insights | Discounts > Insights | Coupons impact, Total discount, Top coupon, Usage table (PHI) | Yes (range) |
| Resolution Queue | Orders > Resolution Queue | Doctor Errors, Other Errors, Payment Errors, Pending>3 Days, Pharmacy Delay, Shipping>3 Days, Avg. TAT Sent -> Shipped | No visible range control (current snapshot) |

## 3. Funnel stages

| Stage | Where found | Date range |
|-------|-------------|------------|
| Intakes/consultations started | Marketing Performance CRO funnel ("Questionnaire started") | Yes |
| Intakes/consultations completed & submitted | Marketing Performance CRO funnel ("Patient sign-ups" step, i.e. account/checkout conversion - closest proxy found) | Yes |
| Awaiting provider review | Patients/Treatments list, filter Visit status = Pending/Scheduling | Yes (via list date-range icon) |
| Provider approved / prescription written | Patients/Treatments list, filter Visit status = Approved | Yes |
| Provider declined / patient disqualified | Patients list, filter Patient status = Declined/Denied/Abandoned, or Visit status = Denied | Yes |
| Order placed / first payment collected | Orders list ("Total orders"), filter Payment Status = Paid | Yes |
| Active subscriptions | Orders > Payments > Subscriptions tab, filter = Active | No range control seen on this screen |
| Cancellations and refunds | Orders list ("Refunded" count); Orders > Payments > Subscriptions (Canceled/Refunded/Partially Refunded); Finances > Refund Insights | Yes (Orders has range; Refund Insights has year selector) |

## 4. Timing

Found in three places, none fully populated yet:

1. Orders list header **"Avg. Time to fulfill"** (currently N/A, no data)
2. Orders > Resolution Queue **"Avg. TAT Sent -> Shipped"** (currently showing a live value)
3. Analytics > Reports > **Time Metrics** tab, which is explicitly structured to show average time between each of the 5 funnel stages but is labeled "premium feature still in development, data might not be accurate."
No working "intake submitted -> provider review" specific metric was found. Closest is Reports > Time Metrics once populated.

## 5. Disqualification reasons

**Not found** for intake/provider declines specifically.

The only adjacent aggregate-by-reason feature found is Finances > Refund Insights -> "Refunds reason analysis," which is designed to break down refunds by reason count, but currently shows "No refunded reasons found - please add a refunded reason to get started."

No equivalent breakdown exists yet for provider-declined or abandoned-intake reasons. Confirm with Bask support whether this exists elsewhere.

## 6. Filters

| Key | Values |
|-----|--------|
| `date_presets` | Yesterday, Last 3 days, Last 7 days, Last Month, Last 3 Months, Last 6 Months, Last Year, custom calendar range (consistent across Patients/Orders/Coupon Insights date pickers) |
| `filters` | Varies by screen. **Patients/Treatments:** Refills, Visit status, Patient status, Custom Status, Test mode, Show archived. **Orders:** Custom Status, Payment Status, Visit Status, Order Status, Product, Pharmacies, Pharmacy Status, Payment/Shipping Schedule. **Marketing:** channel selector |
| `comparison` | Yes - Home dashboard auto-shows Current Period vs Previous Period; Analytics Dashboard has an explicit comparison-period dropdown |

## 7. Export

Export exists in several places but is largely gated behind an inactive paid **"Data Exports"** add-on (seen via Export History page and the lock icon on Patients/Treatments/Orders list toolbars - both show a "Get Data Exports" upsell).

Two exceptions found that are **not** gated:

- **Reports > Segments** tab has a visible Export button (scope: the patient segment table)
- **Orders > Upcoming** has an Export button that fires immediately with no confirmation step (scope: the Upcoming Orders table, patient-level)
Note: an Export action on Orders > Upcoming was inadvertently triggered during this recon - already disclosed separately; no file was downloaded locally.

## 8. Integrations

| Capability | Status |
|------------|--------|
| `webhooks` | Found - Settings > Webhook & API. None currently configured. Supported event types include: New Order, New Patient, New Prescription, Order Shipped, Order Updated, New Treatment, Treatment Updated, Subscription Created, Subscription Updated, Questionnaire Updated, Abandoned Session, Magic Link, Payment Created/Failed/Succeeded/Canceled/Refunded, Dispute Created/Updated, New Affiliate Conversion, Profile Updated, Check-in Due. |
| `api` | Same "Webhooks & API" settings page only showed a Webhooks section - no separate API key management or public docs link was found. BaskQL (Analytics > BaskQL) is an internal SQL-style query tool, not a public REST API. No API documentation URL located. |
| `conversion_postback` | Found - Settings > Apps & Integrations > "Meta (Facebook) Pixel" supports an optional server-side Access Token for Meta's Conversions API ("server-side conversion tracking...better attribution and works even when users have ad blockers"). Not currently connected. |
| `offline_conversion_export` | **Not found.** No dedicated Google/Meta offline conversion CSV export tool was located; closest capability is the Meta Conversions API access-token field above. |
| `pixel_settings` | Found - Settings > Apps & Integrations lists Google Analytics (connected), Google Tag Manager (connected), Meta (Facebook) Pixel (not connected), TikTok Pixel (not connected). |

## 9. PHI screens (avoid in future automation)

- Patients (list + any individual record)
- Treatments (list + individual records)
- Orders (individual order detail)
- Orders > Upcoming
- Orders > Payments (Payments tab)
- Messenger (conversation threads)
- Analytics > Marketing "Top Patients" table
- Discounts > Insights usage table
- Store Credit > Insights (presumed similar)
- Analytics > Reports > Segments "View details" drill-in
- BaskQL (any executed query touching patient-level tables)
## Notes

- Several premium analytics screens (Reports > Time Metrics, Retention, Aggregates, Segments) are explicitly labeled "still in development, data might not be accurate - should be validated." A collector should treat these as provisional pending Bask confirmation.
- SLA Performance requires rule configuration before it's usable.
- Export/CSV is largely gated behind an inactive paid add-on - a purchasing decision would be needed to unlock full export history.
- It is unclear whether ad-platform conversion tracking (Meta/TikTok/Google) is configured anywhere outside this settings page; worth confirming directly with Bask support.
- Data volume is very low (3-4 days live), so most charts/timing metrics show "No data" - structure was verified, but populated behavior of some reports could not be confirmed.
- As previously flagged, an Export action on Orders > Upcoming was accidentally triggered during this session; follow up separately with Bask support if needed.
No patient-level data was transcribed.
