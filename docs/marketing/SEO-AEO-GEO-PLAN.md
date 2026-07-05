# SEO / AEO / GEO & Marketing Growth Plan

**Goal:** Rank at or near the top of search — classic Google results, answer boxes / AI Overviews (AEO), and generative engines like ChatGPT, Perplexity, and Gemini (GEO) — for weight-loss-drug and GLP‑1 telehealth queries, and convert that traffic through the qualify → intake funnel.

**Status:** Draft plan — created July 2026. Owner: TBD.
**Companion docs:** `docs/features/landing-pages.md`, `docs/features/analytics.md`, `docs/HIPAA.md`.

---

## 0. Reality check (read this first)

"Weight loss drugs" head terms are among the most expensive and competitive queries on the internet. Page 1 today is Mayo Clinic, WebMD, Drugs.com, GoodRx, Hims/Hers, Ro, Noom Med — sites with eight-figure ad budgets and 10+ years of domain authority. Search interest in "semaglutide" grew >3,000% between 2020 and 2024, and Ozempic alone spent an estimated $7.5M on ~15,000 paid keywords over two years.

That means the winning strategy for us is **not** "outrank WebMD for *weight loss drugs*" in year one. It is:

1. **Own the long tail now** — comparison, cost, state-level, compounded-vs-brand, and "switching" queries where authority sites are thin and telehealth intent is highest.
2. **Win AEO/GEO early** — AI answers cite well-structured, factually dense, medically reviewed pages regardless of domain age. This is the fastest path to visibility for a young domain and where the field is still open.
3. **Buy the head terms** with paid search (LegitScript-certified Google Ads) while organic authority compounds.
4. **Build E-E-A-T relentlessly** — this is YMYL (Your Money or Your Life) content; Google will not rank us for medical queries without visible medical credentials, citations, and trust signals.

Realistic organic timeline: long-tail rankings in 3–6 months, mid-tail in 6–12, head-term contention in 18–36 months. Paid + AEO/GEO fill the gap.

---

## 1. Where we are today (codebase audit — July 2026)

### What's already good

| Asset | Detail |
|---|---|
| Prerendered static HTML | `vite.config.ts` — TanStack Start `prerender: { enabled: true }`. Crawlers get full HTML, not an empty SPA shell. This is the single most important technical prerequisite and it's done. |
| Per-route meta | `head()` with title/description/OG/Twitter on `index`, `weight-loss`, `pricing`, `how-it-works`, `about`, `faq`, `safety`, `contact`, all `legal.*` routes. |
| FAQ structured data | `src/routes/faq.tsx` ships `FAQPage` JSON-LD. |
| Sitemap route | `src/routes/sitemap[.]xml.ts` exists. |
| robots.txt | `public/robots.txt` exists, allows crawl, blocks `/qualify`. |
| Landing-page CMS | `lp.$slug.tsx` + staff LP builder — ideal for paid-traffic pages. |
| UTM capture + analytics | `capturePageUtms()` in `__root.tsx`, staff analytics dashboard. |

### Gaps found (each becomes a task in §2)

| # | Gap | Where | Impact |
|---|---|---|---|
| G1 | Sitemap `BASE_URL = ""` → `<loc>` values are relative paths. Invalid per the sitemap protocol; Google may discard the whole file. | `src/routes/sitemap[.]xml.ts` | High |
| G2 | ~~robots.txt has no `Sitemap:` directive and doesn't block funnel/portal/staff routes.~~ **Done July 2026** — see A2. | `public/robots.txt` | ✅ |
| G3 | Canonical links are relative (`href: "/pricing"`). Google wants absolute canonicals; relative ones are unreliable. No `og:url` anywhere. | every route with `head()` | High |
| G4 | `og:image` / `twitter:image` are relative paths — social/AI crawlers need absolute URLs; card previews currently break off-site. | `src/routes/__root.tsx` | Med |
| G5 | `/learn` content hub was **removed** (redirects home). No blog = no content engine = no long-tail rankings. This is the biggest strategic gap. | `src/routes/learn.tsx` | Critical |
| G6 | `lp.$slug.tsx` has no `head()` at all — no title, no description, and critically no `noindex`. Paid LPs duplicating organic pages can trigger duplicate-content problems. | `src/routes/lp.$slug.tsx` | High |
| G7 | `clinicians.tsx`, `insurance.tsx`, `switch.tsx`, and `learn.tsx` all **redirect to `/`** (MVP removals) yet are still listed in the sitemap. A sitemap full of redirecting URLs erodes Google's trust in it. Remove them from the sitemap until the pages come back. | `src/routes/sitemap[.]xml.ts` | High |
| G8 | Structured data is FAQ-only. Missing: `Organization`/`MedicalOrganization`, `WebSite`, `MedicalWebPage`, `Physician`, `Product`/`Offer` (pricing), `BreadcrumbList`. AI engines lean heavily on schema. | site-wide | High |
| G9 | **Brand + domain decided (July 2026): Beema Health at beemahealth.com** (domain purchased). Production still serves from aretide.com until cutover — see the migration checklist below. Internal docs/copy still say Aretide in places; that rebrand is a separate low-cost cleanup task, **not part of this plan's execution**. | site-wide | Cutover pending |
| G10 | Google Fonts loaded from CDN render-blocking; hurts LCP/CWV. | `__root.tsx` | Med |
| G11 | ~~No `llms.txt`~~ (**shipped July 2026** — `public/llms.txt`); still missing: author/medical-reviewer bylines and an editorial policy page — table stakes for YMYL E-E-A-T and GEO. | site-wide | High |

> **Domain cutover checklist (aretide.com → beemahealth.com):** hosting stays on GitHub Pages — the new domain is just a `public/CNAME` + DNS change. Do the cutover **before** link building and PR start, so all future equity accrues to beemahealth.com. In one release: update `public/CNAME`, `robots.txt` Sitemap line, `llms.txt` URLs, sitemap `BASE_URL` (`VITE_SITE_URL`), and absolute canonicals (A3). Then: verify beemahealth.com in Google Search Console + Bing Webmaster Tools and submit the sitemap. For the old domain: GitHub Pages can't 301 one domain to another, so either (a) put aretide.com's DNS on free Cloudflare with a bulk redirect rule `aretide.com/* → beemahealth.com/$1` (301) and file a Search Console change-of-address — the clean option; or (b) if GSC shows aretide.com has negligible indexed pages/backlinks/traffic, skip formal migration but still keep a redirect on the old domain so shared links don't 404.

### Indexing scope (decided July 2026)

Only static, prerendered marketing pages get indexed — everything else is a crawl/index exclusion, and user-behavior measurement there belongs to Google Analytics, not search:

- **Indexed (each with its own prerendered static page and unique meta):** `/`, `/weight-loss`, `/how-it-works`, `/pricing`, `/about`, `/faq`, `/safety`, `/contact`, `/legal/*` — plus `/learn` articles once the content hub returns.
- **Never indexed:** `/login`, `/qualify`, `/intake`, `/consent`, `/submitted`, `/eligibility`, `/dashboard/*`, `/staff/*`, `/admin/*`, `/verify-email/*`, `/lp/*` (paid landing pages — `noindex`, they convert, they don't compete).

### Bask integration note

Frontend CTAs will link into the Bask flow on the backend side; that wiring is pending and **out of scope for SEO work** — nothing in the funnel needs search visibility. When the Bask hookup lands, the only SEO touchpoint is confirming CTA destinations stay excluded from indexing (robots + `noindex`) and that GA conversion events keep firing.

---

## 2. Workstream A — Technical SEO (engineering, weeks 1–3)

Ordered backlog. All items are small, code-level, and testable.

### A1. Fix the sitemap (G1)
- Set `BASE_URL` to the canonical production origin (env-driven: `VITE_SITE_URL`).
- Add `/about` (currently missing); remove or fix any route that 404s.
- Add `<lastmod>` sourced from a per-entry date constant.

### A2. Harden robots.txt (G2) — ✅ shipped July 2026
`public/robots.txt` now blocks all funnel/portal/staff/login routes plus `/lp/`, declares the sitemap URL, and documents that AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot) are intentionally allowed — GEO requires being crawlable by them; never blanket-block AI user-agents. If the domain changes, update the `Sitemap:` line together with the sitemap's `BASE_URL`.

### A3. Central SEO helper (G3, G4, G7)
Create `src/lib/seo.ts`:
```ts
export function pageHead(opts: { title: string; description: string; path: string; ogImage?: string; jsonLd?: object[] })
```
— emits absolute canonical, `og:url`, absolute OG/Twitter image URLs, and JSON-LD scripts from one place. Refactor existing routes onto it; add `head()` to `clinicians`, `insurance`, `switch`.

### A4. `noindex` + meta for landing pages (G6)
`lp.$slug.tsx`: add `head()` with LP title/description and `<meta name="robots" content="noindex,follow">`. Paid LPs should convert, not compete with organic pages.

### A5. Site-wide structured data (G8)
- `__root.tsx`: `Organization` (or `MedicalOrganization`) + `WebSite` JSON-LD — name, logo, sameAs (social profiles), contactPoint.
- `pricing.tsx`: `Product` + `Offer` with real prices (from `veya-data.ts`).
- Treatment pages: `MedicalWebPage` + `Drug`/`MedicalTherapy` where accurate, with `lastReviewed` and `reviewedBy` (→ `Physician` with NPI-verifiable name).
- Article pages (Workstream B): `MedicalWebPage`/`Article` + `author` + `reviewedBy` + `BreadcrumbList` + per-article `FAQPage`.

### A6. Core Web Vitals (G10)
- Self-host Outfit/Figtree as woff2 in `public/fonts/` with `font-display: swap` (also removes a third-party request — minor privacy win).
- Audit hero images: explicit width/height, `fetchpriority="high"` on LCP image, lazy-load below-the-fold.
- Target: LCP < 2.5s, INP < 200ms, CLS < 0.1 on mobile (PageSpeed Insights, real-device).

### A7. GEO plumbing (G11)
- ✅ `public/llms.txt` shipped July 2026 — canonical markdown summary of who we are, treatments, care model, and key page links for LLM crawlers. Keep it in lockstep with site facts: any pricing/treatment/domain change must update `llms.txt` in the same PR.
- OG image: replace the bare logo mark with a branded 1200×630 card.

### A8. Register with the engines (do immediately after A1/A3)
- **Google Search Console** — verify, submit sitemap, monitor coverage weekly.
- **Bing Webmaster Tools** — equally important for AI visibility: ChatGPT search and Microsoft Copilot retrieve from Bing's index. A site invisible to Bing is invisible to ChatGPT's browsing answers.
- **IndexNow** — Bing/Yandex instant-indexing ping; one static API key file in `public/` plus a ping on each deploy. Cheap way to get new/updated articles into the Bing index (and therefore ChatGPT retrieval) within hours instead of weeks.

### A9. Hosting note
GitHub Pages (static) stays — including after the beemahealth.com cutover, which is only a CNAME/DNS change. Known limits: no server-side redirects and no custom headers. The one place that matters is redirecting the retired aretide.com domain, which is solved with free Cloudflare bulk redirects in front of the old domain only (see the G9 cutover checklist) — no hosting move needed.

**Definition of done for Workstream A:** Google Search Console verified, sitemap submitted and "Success", all marketing pages indexed with unique titles, Rich Results test passes on FAQ/Product/Organization, CWV green on mobile.

---

## 3. Workstream B — Content engine (the core organic play)

### B1. Rebuild `/learn` as a real content hub
Currently `learn.tsx` redirects home. Rebuild as file-based prerendered content:

- Route: `learn.tsx` (index) + `learn.$slug.tsx` (articles).
- Content source: markdown/MDX files in `src/content/learn/` with frontmatter (`title`, `description`, `publishedAt`, `updatedAt`, `author`, `medicalReviewer`, `faq[]`). Compiled at build time so every article is prerendered static HTML — no CMS dependency, versioned in git, and the LP builder stays separate for paid pages.
- Every article renders: byline + medical-reviewer credential block, "Medically reviewed on <date>", inline citations to primary sources (FDA labels, NEJM/JAMA trials — SURMOUNT, STEP), and JSON-LD from A5.
- Add articles to the sitemap automatically from the content directory.

### B2. Keyword architecture (hub-and-spoke clusters)

**Cluster 1 — GLP‑1 medications (hub: `/weight-loss`)**
Long-tail spokes, one article each. Examples of target queries where telehealth intent is high and authority competition is thin:
- "compounded semaglutide vs Wegovy" / "compounded tirzepatide vs Zepbound"
- "how much does semaglutide cost without insurance" (cost pages are AEO gold)
- "semaglutide dosage chart / titration schedule"
- "tirzepatide vs semaglutide weight loss results"
- "what happens when you stop taking GLP‑1s" / maintenance dosing
- side-effect management: nausea, food noise, muscle loss, alcohol

**Cluster 2 — Switching & access (hub: `/switch` — currently redirects home; restore the page before building this cluster)**
- "switch from [competitor] to another telehealth provider", "transfer semaglutide prescription", "Wegovy shortage alternatives", "cheapest legit online semaglutide" — highest commercial intent on the board.

**Cluster 3 — Eligibility & safety (hub: `/safety`)**
- "do I qualify for weight loss medication", "BMI requirements for GLP‑1", "GLP‑1 with [condition]" series (thyroid, PCOS, diabetes, pregnancy planning). Safety content earns trust links and E-E-A-T.

**Cluster 4 — State/geo pages (new)**
- "online semaglutide prescription [state]" for every state we serve. Programmatic but each page must have real unique content: state telehealth rules, licensed-provider note, shipping specifics. Thin doorway pages get penalized; do these properly or not at all.

**Cadence & volume:** 8–12 articles/month for the first 6 months (≈60 articles), then 4–8/month maintenance + refreshes. Refresh every article at least every 6 months (`updatedAt` + real content updates) — medical content decays fast in Google's eyes.

### B3. E-E-A-T requirements (non-negotiable for YMYL)
- Named medical reviewer(s) with license/NPI-verifiable credentials on every clinical page; reviewer bio pages linked from bylines.
- `/about` expanded: leadership, medical team, LegitScript seal once certified.
- Editorial policy + medical review policy pages (WebMD/Healthline pattern).
- Cite primary sources inline; never make claims the FDA label or trials don't support.
- Real business footprint: consistent NAP, privacy/terms (done), visible support contact.

---

## 4. Workstream C — AEO (Answer Engine Optimization)

Target: featured snippets, People Also Ask, and Google AI Overviews.

1. **Answer-first formatting:** every article opens with a 40–60 word direct answer to the title query in a `<p>` immediately after the H1. Then the deep dive.
2. **Question-form H2s** matching PAA phrasing ("How much does compounded semaglutide cost per month?") with a 1–3 sentence answer directly beneath, before elaboration.
3. **Tables and lists** for costs, dosage schedules, comparisons — snippets and AI Overviews extract these preferentially. (Cost tables also demonstrate the transparent-pricing brand promise.)
4. **Per-article FAQ blocks** (3–5 Q&As) with `FAQPage` schema.
5. **Snippet monitoring:** track which target queries show snippets/AI Overviews and who owns them (Ahrefs/Semrush do this); write to displace.

---

## 5. Workstream D — GEO (Generative Engine Optimization)

Target: being cited/recommended by ChatGPT, Perplexity, Gemini, Claude when users ask "best online semaglutide provider", "cheapest legit GLP‑1 telehealth", etc.

How AI assistants pick who to show: for a query like "best online semaglutide provider," they either (a) retrieve live web results (ChatGPT search → Bing index; Perplexity → its own crawler + web; Gemini → Google) and synthesize from the top pages, or (b) answer from training data, where brand-mention frequency across the open web dominates. Both paths are influenceable:

1. **Be retrievable** — the plumbing (mostly done/queued):
   - AI crawlers allowed in robots.txt ✅, `llms.txt` shipped ✅, static prerendered HTML ✅.
   - Bing Webmaster Tools + IndexNow (A8) — ChatGPT and Copilot can only cite what Bing has indexed.
   - Structured data everywhere (A5) — retrieval pipelines and answer rankers use it.
2. **Be in the pages assistants actually cite.** For "best provider" queries, they overwhelmingly cite third-party roundups, review sites, and Reddit — not vendor homepages. So:
   - Pitch inclusion in every "best GLP‑1 telehealth 2026" listicle and comparison table that exists (Innerbody, Healthline-tier reviewers, Forbes Health, niche telehealth reviewers). This is the single highest-leverage GEO action.
   - Reddit presence (r/semaglutide, r/tirzepatide, r/WeightLossAdvice): genuine, disclosed participation and being the brand users mention organically. No astroturfing — it gets detected and torched.
   - Trustpilot/Google review volume — assistants quote review scores when users ask "is Beema Health legit."
3. **Answer the verification queries yourself.** Publish pages that directly match what users ask assistants about us: "Is Beema Health legitimate?" (licensing, pharmacy partners, LegitScript seal, medical team), pricing transparency, "How Beema Health works." When an assistant fact-checks the brand, our page should be the best source.
4. **Factual density + consistency:** exact prices, exact process ("provider review within X hours", "ships from US pharmacies"), identical across site copy, `llms.txt`, and third-party profiles (LinkedIn, Crunchbase, review sites). LLMs favor — and repeat — sources whose facts are stated plainly and never contradict each other. Every price/process change must propagate everywhere in the same release.
5. **Quotable stat blocks:** each article carries 1–2 crisp, self-contained, citable sentences ("Compounded semaglutide typically costs $X–$Y/month cash-pay as of <month year>"). Assistants lift exactly these. Date-stamp them; freshness is a retrieval feature.
6. **Entity building:** consistent Beema Health entity across LinkedIn, Crunchbase, press mentions, and schema `Organization.sameAs` — this is what moves training-data-level brand recall for path (b).
7. **Measure it:** monthly audit — ask ChatGPT, Perplexity, Gemini, and Claude ~20 standard prompts ("best online semaglutide provider", "cheapest legit GLP‑1 telehealth", "is Beema Health legit", per-state variants), log who gets cited/recommended in a spreadsheet, track our share month over month. Tools like Profound or Peec AI automate this ($300–500/mo) — optional until the manual audit shows traction.

---

## 6. Workstream E — Off-page authority (links & PR)

- **Digital PR:** data-driven stories earn health-journalist links cheaply — e.g., "we analyzed GLP‑1 cash prices across all 50 states" (we have pricing data). 1 campaign/quarter.
- **Expert commentary:** get our medical director quoted in press (Qwoted/Featured/HARO-successors, direct pitching). Each quote = authority link + GEO citation surface.
- **Guest/professional content** in health & telehealth trade publications.
- **Never buy links.** In YMYL, a link penalty is fatal. Budget for PR that *earns* links.
- **Reviews:** Trustpilot/Google reviews program (post-refill email ask, done compliantly — no incentivized reviews, no PHI in responses). Review scores show up in AI answers for "is X legit".

Target: 10–20 quality referring domains/month by month 6.

---

## 7. Workstream F — Paid acquisition (fills the organic gap)

### F1. Prerequisite: LegitScript Healthcare/Telemedicine Certification
Google (and Meta/Microsoft/TikTok) require LegitScript certification to run telehealth/prescription-drug ads. Without it, no paid search on our core terms — full stop.
- Timeline: typically 4–8 weeks. Start immediately.
- Cost: application + annual monitoring, roughly **$2,000–$5,000/yr** depending on tier (confirm current pricing at legitscript.com).
- Also unlocks the LegitScript seal for the site footer (trust/E-E-A-T signal).

### F2. Google Ads
- **Search campaigns** on high-intent terms: "semaglutide online prescription", "tirzepatide telehealth", "GLP‑1 online doctor", competitor-adjacent and "switch/transfer" terms, plus branded defense.
- Expected CPCs in this category commonly run **$8–$30+**; healthcare search averages ~$66 per lead (LocaliQ benchmark). Model CAC accordingly: at a $15 avg CPC and 10% LP→qualify conversion, a qualified lead ≈ $150 before intake completion.
- Land traffic on `lp.$slug` pages (noindexed, A4) with message match per ad group; A/B via the existing experiments system (`staff.experiments.tsx`).
- **Compliance guardrails:** no before/after imagery or specific weight-loss-amount claims (Google policy + FTC), no "Ozempic" brand-jacking in ad copy for compounded products (NAD has been actively going after compounded-GLP‑1 advertisers), clear compounded-vs-FDA-approved disclosure.

### F3. Meta / TikTok
Weight-management ads are restricted (18+ targeting, policy review, LegitScript for Rx). Use for brand/education creative and retargeting of **anonymous marketing-page** visitors only — see F5.

### F4. Budget scenarios (monthly, USD)

| Line item | Lean | Growth | Aggressive |
|---|---|---|---|
| Content (8–12 articles w/ MD review) | $3,000 | $6,000 | $10,000 |
| Medical reviewer stipend | $1,000 | $2,000 | $3,000 |
| Digital PR / link earning | $0 (DIY) | $4,000 | $8,000 |
| SEO tools (Ahrefs or Semrush, Screaming Frog) | $250 | $450 | $700 |
| GEO monitoring tooling | $0 (manual) | $400 | $500 |
| Google Ads spend | $5,000 | $20,000 | $50,000+ |
| Meta/TikTok spend | $0 | $5,000 | $15,000 |
| LegitScript (amortized) | $300 | $300 | $300 |
| **Total / month** | **~$9,600** | **~$38,000** | **~$87,500** |

One-time: LegitScript application, OG/brand asset design, possible domain migration (~$3,000–$8,000 all-in). Engineering time for Workstream A is internal (est. 1–2 weeks of dev time).

Industry benchmark for GLP‑1 practices is $1,000–$15,000+/mo in ad spend even for single-market clinics; national DTC competitors spend 10–100× our "Aggressive" tier. Lean gets long-tail organic + proof-of-funnel paid; Growth is the recommended starting point if the unit economics support ~$150–300 blended CAC.

### F5. HIPAA tracking guardrail (critical)
OCR's guidance on tracking technologies makes third-party pixels on pages handling PHI a breach risk. Rules for all marketing instrumentation:
- Ad pixels (Google, Meta, TikTok) may fire **only** on public marketing pages and `lp.$slug` — never on `/qualify`, `/intake`, `/consent`, `/dashboard`, `/verify-email`, or any authenticated route.
- Conversion tracking past qualify-start uses server-side, de-identified events (Google Enhanced Conversions / Meta CAPI with hashed values reviewed by compliance, or aggregate-only reporting from our own analytics).
- Any new pixel goes through the same review as a code change touching PHI. Document each approved pixel + allowed routes in `docs/features/analytics.md`.

---

## 8. Roadmap

**Weeks 1–3 — Foundation**
- Resolve the brand/domain decision (G9). Everything else keys off this.
- Ship Workstream A (A1–A7). Verify GSC + Bing Webmaster Tools; submit sitemap.
- Start LegitScript application.
- Keyword research pass to finalize the first 30 article briefs (Ahrefs/Semrush).

**Months 1–3 — Engine on**
- `/learn` rebuilt; publish 8–12 articles/month starting with Cluster 2 (switching) and cost/comparison queries — fastest to rank, highest intent.
- Launch Google Ads (once LegitScript clears) on high-intent + branded terms → LP pages.
- First digital-PR campaign. Start review generation. Baseline GEO audit (the 20-prompt spreadsheet).

**Months 4–6 — Compound**
- Complete Clusters 1–3 (~60 articles live). Launch state pages for top-15 states by funnel volume.
- Scale ads to CAC target. Second PR campaign. First content-refresh pass.
- Checkpoint: ≥1,000 organic clicks/mo, ≥25 page-1 long-tail rankings, ≥3 assistant citations in the GEO audit — or revisit strategy.

**Months 7–12 — Authority**
- Target mid-tail terms ("GLP‑1 telehealth", "online weight loss doctor"). All 50 state pages.
- 10–20 new referring domains/mo. AI Overview presence on ≥10 cost/comparison queries.
- Goal: organic + AI channels ≥ 30% of new funnel starts; head-term contention becomes the year‑2 objective.

---

## 9. KPIs & measurement

| Metric | Tool | Cadence |
|---|---|---|
| Impressions/clicks/position by query | Google Search Console | Weekly |
| Rankings on target keyword set (~200 terms) | Ahrefs/Semrush | Weekly |
| Snippet + AI Overview ownership | Ahrefs/Semrush SERP features | Monthly |
| LLM citations (20-prompt audit) | Manual / Profound | Monthly |
| Referring domains | Ahrefs | Monthly |
| Core Web Vitals | GSC CWV report + PSI | Monthly |
| Organic → qualify-start → intake-complete conversion | Existing funnel analytics (UTM/source) | Weekly |
| Blended + per-channel CAC | Ads platforms + funnel analytics | Weekly |
| Indexed pages vs published | GSC coverage | Monthly |

North-star: **qualified intake completions from organic + AI channels per month**, not traffic.

---

## 10. Open decisions & deferred tasks

1. **Domain cutover timing** — beemahealth.com is purchased (July 2026); schedule the cutover (G9 checklist) before any link building, PR, or entity/GEO work begins. Hosting stays on GitHub Pages.
2. **Budget tier** (§F4) — recommend Growth if CAC math holds; Lean is viable but pushes head-term visibility mostly into paid-only.
3. **Medical reviewer** — who is the named, licensed reviewer for content? Required before the first article ships.
4. **Deferred: docs/copy rebrand Aretide → Beema Health** — mechanical find-and-review pass across docs and remaining UI copy; suitable for a cheaper model. Keep `llms.txt`, robots.txt, and all meta consistent when it runs.
5. **Deferred: Bask CTA wiring** — backend/frontend button integration pending; no SEO action until it lands (then re-verify the funnel stays noindexed and GA events fire).

---

## References

- Google healthcare ads policy: https://support.google.com/adspolicy/answer/176031
- LegitScript telemedicine certification: https://www.legitscript.com/certification/telemedicine/
- LegitScript ↔ Google Ads guide: https://stubgroup.com/blog/how-to-get-legitscript-certified-for-google-ads/
- GLP‑1 PPC/DTC ad-spend study (Ozempic, $7.5M/15k keywords): https://pmc.ncbi.nlm.nih.gov/articles/PMC12579337/
- GLP‑1 category marketing benchmarks: https://targetpatientsmd.com/medical-weight-loss-marketing-in-the-glp-1-era-that-works/
- Meta/Google weight-loss ad restrictions overview: https://videnglobe.com/blog/glp-1-products-digital-marketing-how-to-advertise-weight-loss-products-across-meta-and-google
- NAD action on compounded GLP‑1 advertising: https://www.polsinelli.com/publications/nad-compounded-glp-1-advertising-diet
- GLP‑1 cash-pay price landscape: https://teledirectmd.com/cost/weight-loss-glp1-cost/

*Cost figures are planning estimates from public benchmarks as of July 2026 — validate CPCs with a Google Keyword Planner pull and LegitScript pricing directly before budgeting.*
