# src/CLAUDE.md — Frontend context for Claude Code

Loaded when working in `src/`. See root `CLAUDE.md` and `AGENTS.md` for full project standards.

---

## Frontend input validation

When adding or changing any user input in `src/`:

| Input type | Validator file | Step wiring |
|------------|----------------|-------------|
| Email, phone, name, numbers | `src/lib/form-validation.ts` | `qualify-steps.ts` / `intake-steps.ts` |
| Address, ZIP, city | `src/lib/address-validation.ts` | `intake-steps.ts` |

Test files: `src/lib/__tests__/` — run `npm test`
Attack payloads: `src/lib/__tests__/fixtures/malicious-payloads.ts`

### Required test cases

1. Success — valid payload passes
2. Empty / missing — returns error
3. Invalid format — wrong type or out of range
4. Injection (strict fields) — SQL, XSS, path traversal, command injection → must reject

**Strict fields:** email, phone, legal name, height, weight, ZIP, address, city, numeric labs.
**Free-text fields** (notes, reactions): test required/empty; SQL may pass as literal — React must not render raw HTML.

### Checklist for new frontend inputs

- [ ] Validator in `form-validation.ts` or `address-validation.ts`
- [ ] Step error wiring in `qualify-steps.ts` / `intake-steps.ts`
- [ ] Vitest unit tests (success + empty + invalid + injection)
- [ ] `npm run test:all` passes
- [ ] `npx tsc --noEmit` clean on changed files
- [ ] ESLint clean on changed files

---

## Routes

File-based routing in `src/routes/` via TanStack Router — see `src/routes/README.md`.
Do **not** create `src/pages/`.
After route changes, run `npx tsc --noEmit` — Vitest does not typecheck route files.

Patient funnel:
- `/qualify` — pre-signup eligibility + account creation
- `/intake` — 12-step medical questionnaire
- `/consent` — legal acknowledgments + signature
- `/dashboard` — post-submission status

---

## Design system

Never hardcode ad hoc colors in routes or components.

| File | Role |
|------|------|
| `src/styles.css` | Raw brand palette (oklch values) — change base hues here only |
| `src/lib/design-tokens.ts` | Master usage file — import from here |
| `src/components/portal/AccountSectionCard.tsx` | Reusable portal section card |

New portal section → use `AccountSectionCard` with a `tone` from `SectionTone`.
New tone slug → add to `SECTION_TONE_PALETTE` in `design-tokens.ts`.

---

## PHI rules

- **Never** store PHI in `localStorage` or `sessionStorage`.
- Pre-account funnel data goes to `POST /api/funnel/session/` + `PATCH /api/funnel/eligibility/` (HttpOnly cookie).

Full compliance checklist: `docs/HIPAA.md`
