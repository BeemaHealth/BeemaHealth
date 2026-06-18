# Archived marketing pages (pre–Step 1 launch)

> **Purpose:** Full marketing site navigation and page content from the original Lovable import, removed while building the intake funnel (Steps 2–8). Use this doc (and the files in [`archived-marketing/`](archived-marketing/)) to restore pages for **[Step 1 — Marketing Website](../Starting%20Point/launchPlan.md#step-1--build-the-marketing-website)**.

**Step 1 target pages:** Home, Weight Loss, Pricing, FAQ, Safety, Contact — each driving **"See If You Qualify"** → `/qualify`.

**Source commit:** `bbe01d1` ("Import Lovable site") — archived copies match that commit.

---

## What was removed

For Step 1, marketing pages were stubbed with redirects to `/` and nav links were commented out. Only a **simplified** `/how-it-works` page remains live (3 steps instead of 5). **Weight Loss** and **Contact** are net-new pages not in the archive.

| Route | Nav label | Step 1 status | Archived source |
|-------|-----------|---------------|-----------------|
| `/` | Home | **Live** | — |
| *(TBD)* | Weight Loss | **Not built** | — |
| `/how-it-works` | How it works | **Simplified** (live, 3 steps) | [routes/how-it-works.tsx](archived-marketing/routes/how-it-works.tsx) — full 5-step version |
| `/pricing` | Pricing | Redirect → `/` | [routes/pricing.tsx](archived-marketing/routes/pricing.tsx) |
| `/faq` | FAQ | Redirect → `/` (header + footer only) | [routes/faq.tsx](archived-marketing/routes/faq.tsx) |
| `/safety` | Safety | Redirect → `/` | [routes/safety.tsx](archived-marketing/routes/safety.tsx) |
| *(TBD)* | Contact | **Not built** | — |
| `/switch` | Switch to Aretide | Redirect → `/` (not in Step 1) | [routes/switch.tsx](archived-marketing/routes/switch.tsx) |
| `/insurance` | Insurance & Pharmacy | Redirect → `/` (not in Step 1) | [routes/insurance.tsx](archived-marketing/routes/insurance.tsx) |
| `/clinicians` | Clinicians | Redirect → `/` (not in Step 1) | [routes/clinicians.tsx](archived-marketing/routes/clinicians.tsx) |
| `/learn` | Learn | Redirect → `/` (footer + mobile menu only; not in Step 1) | [routes/learn.tsx](archived-marketing/routes/learn.tsx) |

### Navigation (header)

Original header nav — all six primary links plus FAQ in the desktop CTA row:

```ts
const NAV = [
  { label: "How it works", to: "/how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "Switch to Aretide", to: "/switch" },
  { label: "Insurance & Pharmacy", to: "/insurance" },
  { label: "Clinicians", to: "/clinicians" },
  { label: "Safety", to: "/safety" },
];
```

Mobile sheet also linked `/faq`, `/learn`, and had a secondary "Switch from another provider" button.

**Archived full header:** [components/site/SiteHeader.tsx](archived-marketing/components/site/SiteHeader.tsx)

**Current MVP header:** [`src/components/site/SiteHeader.tsx`](../src/components/site/SiteHeader.tsx) — nav array is empty (commented out); adds session-aware Log in / Dashboard. **Do not blind-copy** the archived header — merge nav links into the current file.

### Navigation (footer)

Original footer had two columns:

| Column | Links |
|--------|-------|
| **Product** | How it works, Pricing, Switch to Aretide, Insurance & Pharmacy |
| **Trust** | Clinicians, Safety & eligibility, Learn, FAQ |

Tagline: *"Weight-loss care with real clinicians, clear pricing, and refill help that actually follows through."*

**Archived full footer:** [components/site/SiteFooter.tsx](archived-marketing/components/site/SiteFooter.tsx)

**Current MVP footer:** [`src/components/site/SiteFooter.tsx`](../src/components/site/SiteFooter.tsx) — MVP + Legal columns only.

---

## Shared data (still in repo)

These pages import mock data from [`src/lib/veya-data.ts`](../src/lib/veya-data.ts), which **was not removed**:

| Export | Used by |
|--------|---------|
| `CLINICIANS`, `LAUNCH_STATES` | `/clinicians` |
| `PHARMACY_PARTNERS` | `/insurance` |
| `FAQ_GROUPS` | `/faq` |
| `LEARN_POSTS` | `/learn` |

No data migration needed — restore route files and the imports work.

---

## Page content summary

### How it works (`/how-it-works`)

**Hero:** "A calm, clear path from intake to refills"

**5 steps:**
1. Complete online health intake
2. A licensed clinician reviews
3. If appropriate, prescription is routed
4. We help with pharmacy, insurance & refills
5. Track progress in the app

**CTAs:** "See if you qualify" → `/qualify`, "See clear pricing" → `/pricing`

Includes SEO meta tags and canonical `/how-it-works`.

### Pricing (`/pricing`)

**Hero:** "Pricing you can actually understand" — membership and medication billed separately.

**Membership:** $79/month. Included: clinician evaluation, messaging, refill coordination, insurance & pharmacy rescue desk, progress tracking. Not included: medication, shipping, labs, copays.

**Interactive calculator:** Medication path (insurance $25–75, cash-pay $199–349, local pharmacy $60–320), delivery (standard free, cold-chain $25, pickup free), optional labs (+$75).

**Sections:** Cancellation (self-serve), pause rules, pre-bill reminders; shipping/labs/insurance caveats; closing CTA "No surprises. Ever."

### Switch to Aretide (`/switch`)

**Hero:** "Switching providers? We'll make it smooth."

**Provider chips:** Hims/Hers, Ro, Noom, WeightWatchers, Medvi, A local clinic, Another provider.

**Intake topics:** Current medication & dose, last injection date, refill status, provider & pharmacy, insurance, reason for switching.

**Upload cards:** Prescription label, lab results, medical records, prior authorization docs.

**Disclaimer:** Transfer does not guarantee prescribing.

### Insurance & Pharmacy (`/insurance`)

**Hero:** "The cheapest, fastest path to your medication"

**Four help cards:** Prior authorization support, local pharmacy routing, stock checks, refill escalation.

**Pharmacy partners table:** Aretide Mail Pharmacy, Regional Compounding Partner, Local Retail Network — with shipping/pickup/insurance/cash-pay columns.

**Can do / can't control** lists. CTA: "Get insurance help" → `/qualify`.

### Clinicians (`/clinicians`)

**Hero:** "Care from named, licensed providers"

**Three clinician cards** (from `CLINICIANS`): Dr. Amara Osei, Daniel Reyes, Priya Shah — bios, credentials, states, response-time note.

**Sections:** Clinical independence, licensure coverage (`LAUNCH_STATES` chips). CTA: "See if you qualify".

### Safety (`/safety`)

**Hero:** "Plain-language safety, no fine-print games"

**Sections:** Who may be eligible, common contraindications (MTC/MEN2, pancreatitis, pregnancy, etc.), possible side effects, emergency warning signs (call 911), clinical independence disclaimer.

### FAQ (`/faq`)

Accordion page built from `FAQ_GROUPS` — categories: Pricing, Insurance, Medication, Shipping, Refills, Cancellation, Eligibility, Labs, Privacy. Includes FAQPage JSON-LD schema.

### Learn (`/learn`)

Grid of educational post cards from `LEARN_POSTS` (8 articles: GLP-1 basics, insurance guide, prior auths, side effects, protein/strength, ask your doctor, switching providers, cost guides). Cards are placeholders — no individual post routes existed.

---

## Restoration guide (for humans & AI agents)

When asked to **restore the full marketing site**, follow this checklist:

### 1. Route files

Copy archived route files into `src/routes/` (overwrite MVP stubs):

```bash
cp docs/archived-marketing/routes/pricing.tsx src/routes/pricing.tsx
cp docs/archived-marketing/routes/switch.tsx src/routes/switch.tsx
cp docs/archived-marketing/routes/insurance.tsx src/routes/insurance.tsx
cp docs/archived-marketing/routes/clinicians.tsx src/routes/clinicians.tsx
cp docs/archived-marketing/routes/safety.tsx src/routes/safety.tsx
cp docs/archived-marketing/routes/faq.tsx src/routes/faq.tsx
cp docs/archived-marketing/routes/learn.tsx src/routes/learn.tsx
cp docs/archived-marketing/routes/how-it-works.tsx src/routes/how-it-works.tsx
```

### 2. Header

In `src/components/site/SiteHeader.tsx`:

- Uncomment / restore the six `NAV` items (labels and paths above).
- Keep current session logic (`getSession`, Log in / Dashboard) unless product asks otherwise.
- Optionally restore desktop FAQ link and mobile sheet extras (`/faq`, `/learn`, switch CTA) from the archived header.

### 3. Footer

In `src/components/site/SiteFooter.tsx`:

- Restore **Product** and **Trust** link columns from the archived footer.
- Decide whether to keep the current **Legal** column and MVP disclaimer text or merge with archived legal links in the bottom bar.

### 4. Sitemap

[`src/routes/sitemap[.]xml.ts`](../src/routes/sitemap%5B.%5Dxml.ts) already lists all marketing URLs — no change needed unless routes were renamed.

### 5. Verify

```bash
npm run build
```

Manually check each restored URL loads with `MarketingLayout`, meta tags, and CTAs pointing to `/qualify` (or update CTAs if copy changed site-wide).

### 6. Optional: partial restore

To restore **only nav + specific pages**, copy just those route files and add only the matching `NAV` / footer entries. The archived files are independent.

---

## Related changes (not in archive)

These differ from the original marketing site — reconcile when completing [Step 1](../Starting%20Point/launchPlan.md#step-1--build-the-marketing-website):

| Area | Original | Current (pre–Step 1) |
|------|----------|----------------------|
| Primary CTA | "See if you qualify" | "Start eligibility check" — **Step 1 success criteria requires "See If You Qualify"** |
| Header auth | FAQ + qualify only | Log in / Dashboard when session exists |
| Landing [`src/routes/index.tsx`](../src/routes/index.tsx) | Full marketing homepage | Trimmed for intake funnel |
| `how-it-works` | 5 steps, pricing CTA | 3 steps, no pricing link |
| Weight Loss page | — | Not built (Step 1) |
| Contact page | — | Not built (Step 1) |

---

## File index

```
docs/
├── archived-marketing-pages.md          ← this file
└── archived-marketing/
    ├── routes/
    │   ├── how-it-works.tsx
    │   ├── pricing.tsx
    │   ├── switch.tsx
    │   ├── insurance.tsx
    │   ├── clinicians.tsx
    │   ├── safety.tsx
    │   ├── faq.tsx
    │   └── learn.tsx
    └── components/site/
        ├── SiteHeader.tsx
        └── SiteFooter.tsx
```
