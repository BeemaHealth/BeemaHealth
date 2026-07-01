# Beluga flow diagram sources

| File | Rendered PNG |
|------|----------------|
| `overview.mmd` | `overview.png` |
| `new-patient-flow.mmd` | `new-patient-flow.png` |
| `new-patient-sequence.mmd` | `new-patient-sequence.png` |
| `same-dose-flow.mmd` | `same-dose-flow.png` |
| `same-dose-sequence.mmd` | `same-dose-sequence.png` |
| `titration-flow.mmd` | `titration-flow.png` |
| `titration-sequence.mmd` | `titration-sequence.png` |

Edit the `.mmd` files, then re-render PNGs for `beluga-integration.md`:

```bash
cd docs/features/diagrams
npx -y @mermaid-js/mermaid-cli -i overview.mmd -o overview.png -b white -w 1400
# repeat for each .mmd, or loop over *.mmd
```

Requires Chrome for Puppeteer (`npx puppeteer browsers install chrome-headless-shell` once).

Live Mermaid (Cursor Plan view): `.claude/plans/beluga-integration-flows.plan.md`
