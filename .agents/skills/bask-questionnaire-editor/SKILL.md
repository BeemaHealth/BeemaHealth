---
name: bask-questionnaire-editor
description: Inspect and edit Beema Health's Bask intake questionnaires in the authenticated Bask merchant portal using the ChatGPT in-app browser, including questionnaire JavaScript, question configuration, previewing, draft saves, and explicitly requested publishing. Use when Matt asks to review, change, debug, or operate the Bask questionnaire editor. Do not use the patient Headless submission API as an editor.
---

# Bask questionnaire editor

Use the ChatGPT in-app Browser and its `control-in-app-browser` skill for all Bask portal interaction. Reuse an authenticated Bask merchant tab when available. If Bask requires authentication, ask Matt to sign in in the in-app browser and say when it is ready.

## Project context

Before editing, read:

- [`AGENTS.md`](../../../AGENTS.md) for Beema terminology and production rules.
- [`docs/HIPAA.md`](../../../docs/HIPAA.md) for PHI handling.
- [`references/portal-recon-2026-08-15.md`](references/portal-recon-2026-08-15.md) for known portal navigation and PHI screens.
- [`references/questionnaire-answer-submission-api.md`](references/questionnaire-answer-submission-api.md) only when the requested JavaScript submits patient answers or integrates with Bask Headless.

The Headless `POST /api/headless/v1/questions-answers` endpoint submits a patient's answers. It does not edit a questionnaire template. Use the merchant portal's **Questionnaires** editor for template, question, and embedded-JavaScript changes.

## Workflow

1. Establish the exact questionnaire and requested outcome from the user's prompt and current browser state. Do not guess between similarly named questionnaires.
2. Navigate only through the Bask merchant portal's **Questionnaires** area. Avoid the PHI screens listed in the portal recon unless the user separately and explicitly requests work there.
3. Inspect the current questionnaire, editor state, and complete existing JavaScript before changing anything. Record enough non-sensitive detail to explain the original behavior and preserve the exact original script in working notes before replacement.
4. Make the smallest change that achieves the requested behavior. Preserve existing identifiers, branching, analytics, and integrations unless the request requires changing them.
5. Treat any tokens, credentials, patient identifiers, answers, or portal URLs as sensitive. Never copy them into chat, repository files, logs, browser storage, analytics, or test fixtures. Never put `sk_*` keys in questionnaire JavaScript.
6. Validate JavaScript syntax and editor validation before saving. Preview with synthetic, non-PHI data and exercise the affected path plus one adjacent path when the portal supports previewing.
7. Save as a draft when saving is required to preserve the requested edit. Publishing, activating, deleting, replacing a live version, or otherwise exposing the change to patients requires an explicit request from the user. Immediately before such an action, verify the questionnaire name and summarize the pending live effect.
8. After any save or publish action, re-open or re-inspect the relevant editor state and report the questionnaire, action taken, validation performed, and any limitation.

## Safety boundaries

- Do not submit real questionnaire responses through the Headless API while testing editor changes.
- Do not visit patient, treatment, order-detail, messenger, patient-segment detail, or patient-level analytics screens for an editor task.
- Do not trigger exports, purchases, plan upgrades, integrations, or webhook changes unless explicitly requested.
- Do not claim a change is saved, published, or validated unless the browser shows evidence of that state.
- If the portal has no draft/version protection, stop before overwriting existing JavaScript and ask the user how they want the original preserved.

## Completion report

State what changed, whether it is only a draft or live, what was tested with synthetic data, and any remaining manual or clinical review needed. Do not include PHI, credentials, or full sensitive browser URLs.
