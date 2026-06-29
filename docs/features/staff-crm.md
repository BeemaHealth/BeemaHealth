# Staff CRM

Staff is the internal operator interface at `/staff/*`. Access requires `is_staff=True` on the `User` model (set via Django admin or shell). Staff users are not patients — they cannot access patient-facing routes, and patients cannot access staff routes.

## Navigation sections

| Route | Purpose |
|-------|---------|
| `/staff` | Dashboard overview |
| `/staff/patients` | Patient list — search, view intake status, review submissions |
| `/staff/analytics` | Funnel analytics, traffic, drop-off, LP performance |
| `/staff/landing-pages` | Create and manage landing pages |
| `/staff/medications` | Medication catalog — add/edit/deactivate |
| `/staff/questionnaires` | Questionnaire builder — create, version, publish questionnaires |
| `/staff/experiments` | A/B experiments — create variants, set weights, start/stop |

## Permissions model

All staff API endpoints use `IsStaff` permission class (`backend/apps/common/permissions.py` or similar). The frontend staff layout (`src/routes/staff.tsx`) redirects non-staff users to login.

## Patient management

Staff can view a patient's full record: eligibility answers, intake sections, consent records, documents, and order history. Write access is limited — staff cannot edit intake answers directly; they can flag records for review or update prescription/order status.

## Questionnaire builder

The CRM is the primary interface for the dynamic questionnaire system. Staff can:
- Create a new questionnaire tied to a medication
- Add/reorder/remove steps and fields within a version
- Use the flowchart view (`FlowchartBuilder.tsx`) for visual step routing
- Publish a version (makes it live for patients)
- Archive old versions (historical data retained)

See `docs/features/dynamic-questionnaire.md` for the full data model.

## Key files

| File | Role |
|------|------|
| `src/routes/staff.tsx` | Staff layout + auth guard |
| `src/lib/staff-nav.ts` | Nav link definitions |
| `src/routes/staff.patients.tsx` | Patient list UI |
| `src/routes/staff.analytics.tsx` | Analytics dashboard |
| `src/routes/staff.landing-pages.tsx` | Landing page manager |
| `src/routes/staff.medications.tsx` | Medication catalog UI |
| `src/routes/staff.questionnaires.*.tsx` | Questionnaire builder routes |
| `backend/apps/analytics/staff_views.py` | Analytics + LP API |
| `backend/apps/staff/` | Staff-specific API views (if present) |
