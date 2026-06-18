# Aretide MVP Launch Plan

> **Acronyms:** See [../README.md](../README.md#glossary-acronyms-used-in-this-repo) for infrastructure terms. This doc also uses **MVP** (Minimum Viable Product), **FDA** (U.S. Food and Drug Administration), **HIPAA** (Health Insurance Portability and Accountability Act), **MSO** (Management Services Organization), **LLC** (Limited Liability Company), **PC** (Professional Corporation), **MD** (Doctor of Medicine), **DO** (Doctor of Osteopathic Medicine), **NP** (Nurse Practitioner), **CAC** (Customer Acquisition Cost), **SEO** (Search Engine Optimization).

Matt builds the software. Charlie finds suppliers (turnkey clinical partners, pharmacies, growth).

**Our goal is NOT to build Hims.** Our goal is to get our first paying customer as quickly and legally as possible.

---

## Strategy

Assume a **turnkey provider/pharmacy partner** first (OpenLoop, Wheel, SteadyMD, MediVera, Empower, Strive, etc.). Build only what is required to prove the business exists. Do not build internal clinical operations until patient volume justifies it.

| Phase | Steps | Purpose |
|-------|-------|---------|
| **Required to launch** | 1–12 | Prove the business exists |
| **Optimization** | 13–20 | Reduce cost, improve retention, scale — only after Step 12 metrics are known |

**Do not build anything past Step 12 until:**

- Patients are converting
- CAC (Customer Acquisition Cost) is known
- Retention is known
- Unit economics work

---

## Build order (Steps 1–20)

### Step 1 — Build the Marketing Website

**Pages:**

- Home
- Weight Loss
- Pricing
- FAQ
- Safety
- Contact

**Goal:** Generate trust, explain how it works, drive users into the funnel.

**Success criteria:** User can click **"See If You Qualify"**.

**Codebase:** `/` (landing). Archived marketing routes to restore: [docs/archived-marketing-pages.md](../docs/archived-marketing-pages.md). Weight Loss and Contact pages are net-new for this step.

---

### Step 2 — Build the Qualification Funnel

**Collect:**

- Treatment interest
- Weight loss goal
- State
- DOB (date of birth)
- Height
- Weight
- Goal weight
- Sex assigned at birth
- Major contraindications

**Goal:** Determine likely eligibility; capture lead.

**Success criteria:** User reaches account creation.

**Codebase:** `/qualify`. Flow design notes: [docs/Modifying step by step process.md](../docs/Modifying%20step%20by%20step%20process.md). Pre-account persistence: [backend/DATABASE.md — Anonymous funnel session](../backend/DATABASE.md#anonymous-funnel-session-pre-account).

---

### Step 3 — Build Account Creation

**Collect:**

- Email
- Password
- Name

**Goal:** Create patient account.

**Success criteria:** User can sign in and resume intake.

**Codebase:** `POST /api/auth/register/`, `POST /api/auth/login/`. Registration must claim the anonymous funnel draft (see DATABASE.md).

---

### Step 4 — Build Full Medical Intake

**Collect:**

- Address
- Phone
- Conditions
- Medications
- Allergies
- Prior GLP-1 use
- Pregnancy screening
- Eating disorder screening
- Lifestyle questions
- Document uploads

**Goal:** Gather everything the clinician needs.

**Success criteria:** Intake can be submitted.

**Codebase:** `/intake`. Schema reference: [docs/ARETIDE_INTAKE_SCHEMA_V2.md](../docs/ARETIDE_INTAKE_SCHEMA_V2.md).

---

### Step 5 — Build Consent Signing

**Collect:**

- Telehealth consent
- HIPAA/privacy consent
- Medication acknowledgements
- Typed signature

**Goal:** Legally submit case.

**Success criteria:** Case marked **"Submitted"**.

**Codebase:** `/consent`. `consent_records` table — [backend/DATABASE.md](../backend/DATABASE.md).

---

### Step 6 — Build Patient Dashboard

**Show:**

- Intake Submitted
- Under Review
- Need More Information
- Approved
- Denied
- Prescription Sent
- Shipped

**Goal:** Patient always knows status.

**Success criteria:** Patient can see current stage.

**Codebase:** `/dashboard`. `GET /api/dashboard/me/`.

---

### Step 7 — Build Admin Dashboard

**Show:**

- Patient list
- Status
- BMI
- State
- Submission date

**Goal:** Manage patients.

**Success criteria:** Admin can open any patient.

**Codebase:** `/admin`. `GET /api/admin/patients/`.

---

### Step 8 — Build Patient Detail Screen

**Show:**

- Eligibility answers
- Full intake
- Uploaded docs
- Consents

**Goal:** Single source of truth for ops.

**Success criteria:** Admin sees complete chart.

**Codebase:** `/admin` patient detail. `GET/PATCH /api/admin/patients/{id}/`.

---

### Step 9 — Integrate Turnkey Partner

**Connect:** OpenLoop, Wheel, SteadyMD, etc.

**Workflow:**

```text
Submit Intake → Send To Partner → Receive Status Updates
```

**Goal:** Real clinician review without building an internal provider portal first.

**Success criteria:** First real patient submitted to partner.

---

### Step 10 — Integrate Pharmacy Partner

**Connect:** MediVera, Empower, Strive, etc.

**Workflow:**

```text
Approved → Prescription → Pharmacy → Shipping Updates
```

**Goal:** Medication gets delivered.

**Success criteria:** First shipped order.

---

### Step 11 — Add Stripe

**Collect:**

- Medication payment (per fill or month)

**Goal:** Get paid for prescribed medication.

**Success criteria:** First paid customer.

---

### Step 12 — Launch

**Do not build anything else.** Start running ads.

**Goal:** Get first 10 patients.

**Success criteria:** 10 real patients through the full funnel.

---

## Post-launch optimization (Steps 13–20)

Only after Step 12 metrics are proven. Everything below is **not** required for MVP.

### Step 13 — Build Internal Provider Portal

Add provider dashboard, case review, approval workflow, prescription creation.

**Goal:** Reduce dependency on turnkey provider.

---

### Step 14 — Recruit Your Own Providers

Start with a Colorado physician and Colorado NP.

**Goal:** Lower clinical costs.

---

### Step 15 — Build Prescription Management

Add prescriptions table, refill workflows, provider signing.

**Goal:** Internal clinical operations.

---

### Step 16 — Build Pharmacy Routing

Add pharmacy partners, product catalog, order routing.

**Goal:** Use multiple pharmacies.

---

### Step 17 — Add Direct Pharmacy Relationships

Partner with MediVera, Empower, Strive, Red Rock, Hallandale.

**Goal:** Better pricing and control.

---

### Step 18 — Add Messaging

Add patient ↔ provider messaging and refill communications.

**Goal:** Better patient retention.

---

### Step 19 — Add Automation

Add refill reminders, follow-up reminders, shipment notifications, provider queues.

**Goal:** Reduce operational workload.

---

### Step 20 — Scale

Only after conversion, CAC, retention, and unit economics are known.

---

## What can be manual (Steps 1–12)

Almost everything except compliance-critical systems:

| Manual is fine | Must be built properly |
|----------------|------------------------|
| Doctor notifications | HIPAA security |
| Prescription status updates (until partner API) | Medical records + audit logs |
| Customer support | Consent storage |
| Pharmacy coordination | Access controls (RBAC) |
| Refill reminders | Payment security (Stripe) |
| Checking intakes | Identity verification |

---

## Appendix A — MVP offerings

Aretide's MVP intentionally focuses on a small number of high-demand treatments. The objective is not every medication — it is proving intake → provider review → prescription → fulfillment.

| Offering | Type | Why |
|----------|------|-----|
| **Zepbound** (tirzepatide) | Once-weekly injection | Flagship; strong efficacy and demand |
| **Wegovy** (semaglutide) | Injection and/or pill | FDA-approved for chronic weight management; insurance alternative |
| **Compounded semaglutide*** | Typically injection | Lower-cost cash-pay path (~$199–299/mo) |

These three pathways cover roughly 80–90% of patient situations without overwhelming ops complexity.

*Compounded medications only through licensed pharmacy partners and only when legally available under federal and state regulations.

**Future expansion** (post-Step 12): Zepbound KwikPen, compounded tirzepatide, Ozempic, Mounjaro, Foundayo, retatrutide, cagrilintide-based therapies.

---

## Appendix B — Business structure

You cannot prescribe without legal structure.

**Holdings LLC** (e.g. Veya Holdings LLC) owns software, marketing, brand, employees.

**Professional Corporation (PC)** — owned by the licensed provider; the provider practices medicine. The LLC provides services to the PC. This **MSO (Management Services Organization) model** is standard in telehealth.

Charlie's job: find turnkey partners first; later recruit Colorado MD/DO/NP for Step 14.

---

## Appendix C — Unit economics & CAC

**Compounded example** — patient pays **$299/month** (medication only; no separate platform membership fee):

| Line item | Cost |
|-----------|------|
| Doctor / turnkey review | ~$30 |
| Medication | ~$90 |
| Cold shipping | ~$20 |
| Payment processing | ~$9 |
| Support | ~$10 |
| Refund reserve | ~$10 |
| Software | ~$5 |
| **Total** | **≈ $174** |

Profit ≈ **$125/month** before marketing. Break-even around Month 2 if CAC ≈ $125.

| Channel | CAC | Notes |
|---------|-----|-------|
| Google Ads | $150–400 | Very competitive |
| Facebook | $80–250 | Best balance |
| TikTok | $50–150 | Cheaper; more education |
| Referrals | $10–40 | Best long-term |
| Colorado local partnerships | $10–50 | Gyms, med spas, trainers |

**Launch ads budget suggestion:** ~$1,500 total (Facebook + TikTok + local partnerships). Goal: 10–20 consultations.

| Target | Active patients needed |
|--------|------------------------|
| Break-even | ≈ 20–30 |
| $10k/month profit | ≈ 100–150 |
| $1M revenue/year | ≈ 280–350 at ~$299/mo |

---

## Appendix D — Risks

1. FDA changes to compounded GLP-1 rules
2. Compounding pharmacies stop offering products
3. Margin collapse → pivot to brand-name
4. Insurance coverage changes
5. Ad platform restrictions
6. Turnkey partner or pharmacy shuts down
7. HIPAA breach

---

## Appendix E — Minimum cash before launch

| Category | Amount |
|----------|--------|
| Legal/entity setup | ~$2,000 |
| Provider / turnkey onboarding | ~$3,000 |
| Insurance/compliance | ~$2,000 |
| Software | ~$500 |
| Marketing | ~$2,000 |
| Miscellaneous | ~$500 |
| **Total** | **~$10,000** |

---

## Related docs

| Topic | File |
|-------|------|
| Restore marketing pages (Step 1) | [docs/archived-marketing-pages.md](../docs/archived-marketing-pages.md) |
| Qualify flow design notes (Step 2) | [docs/Modifying step by step process.md](../docs/Modifying%20step%20by%20step%20process.md) |
| Database schema | [backend/DATABASE.md](../backend/DATABASE.md) |
| Intake schema v2 (Step 4) | [docs/ARETIDE_INTAKE_SCHEMA_V2.md](../docs/ARETIDE_INTAKE_SCHEMA_V2.md) |
| Frontend routes | [src/routes/README.md](../src/routes/README.md) |
| HIPAA hosting | [backend/HOSTING.md](../backend/HOSTING.md) |
