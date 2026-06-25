# Dynamic Questionnaire System

Full design doc: `docs/DYNAMIC_QUESTIONNAIRE_SYSTEM.md` — read that first for architectural decisions and known bugs.

This file is the quick reference for how the system works in production code.

## Data model (four-level hierarchy)

```
Questionnaire  (slug, type: qualify|intake, medication FK)
  └── QuestionnaireVersion  (version_label, status: draft|published|archived)
        └── QuestionnaireStep  (step_key, sort_order, title, visibility_rule, routing_rules)
              └── QuestionnaireField  (field_key, field_type, label, options, validation_rules, maps_to_section)
```

- Only one version per questionnaire can be `published` at a time. Publishing archives the previous version.
- `routing_rules` on a step is a JSON array that controls conditional next-step logic.
- `visibility_rule` on a step controls whether the step is shown based on prior answers.
- `maps_to_section` on a field tells the backend which `MedicalIntake` JSON section to write the answer into.
- `plugin_id` on a field (field_type = `plugin`) refers to a hardcoded UI widget (e.g. address picker, payment step).

## Experiments (A/B testing)

```
Experiment  (questionnaire FK, status: draft|running|stopped|archived)
  └── ExperimentVariant  (variant_key, questionnaire_version FK, weight_percent)
```

When an experiment is running, the backend assigns an incoming funnel session to a variant based on `weight_percent`. The assigned `experiment_id` + `variant_key` are stored on `FunnelSession` and carried through to every `FunnelEvent` for attribution.

## Feature flag

The dynamic system is gated behind:
- Frontend: `VITE_DYNAMIC_QUESTIONNAIRES=true`
- Backend: `DYNAMIC_QUESTIONNAIRES=True` (Django setting)

`main` branch never has these flags set. The feature branch does. If the flag is off (or no published questionnaire exists for a medication), the app falls back to the hardcoded questions in `qualify-steps.ts` / `intake-steps.ts`.

## Staff builder

`/staff/questionnaires` — list all questionnaires. Click one to manage versions. Within a version:
- List view: add/reorder/remove steps and fields
- Flowchart view (`FlowchartBuilder.tsx`): visual canvas for routing between steps
- Publish: marks the version live (archives previous published version)

## Key files

| File | Role |
|------|------|
| `backend/apps/questionnaires/models.py` | Full data model |
| `backend/apps/questionnaires/serializers.py` | Serialization + validation |
| `backend/apps/questionnaires/services.py` | Version resolution, session assignment |
| `src/routes/staff.questionnaires.*.tsx` | Builder UI routes |
| `src/components/questionnaire/FlowchartBuilder.tsx` | Visual routing canvas |
| `docs/DYNAMIC_QUESTIONNAIRE_SYSTEM.md` | Full design doc + known bugs |
