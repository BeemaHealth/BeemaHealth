# Beema Health video engine

One engine, two skills: `.claude/skills/beema-organic-video` and `.claude/skills/beema-ad-video`.
Library of hooks/meats/CTAs -> compliance gate -> natural voice with word timings -> Remotion render -> captions -> registry -> Slack package.

Run everything with the existing venv: `shorts/pde5-explainer/.venv/bin/python shorts/engine/beema.py <command>` (alias it as `beema`).

## What is in here
| Path | Purpose |
|---|---|
| `brand.json`, `config.json` | Brand tokens (from `src/styles.css` + Color_scheme.md), voice, phase, Slack channel, posting-time defaults |
| `products.json`, `claims.json` | Product truth (FDA status, prices with verification date, safety text) and the claims registry with sources |
| `library_src/*.py` -> `library/*.json` | 5 products x (50 hooks, 5 meats, 3 CTAs) = 3,750 combinations, stable IDs like `TAD-H02`, `TAD-M1`, `TAD-C1`, version history. Edit the `.py`, run `library build` |
| `compliance/rules.json`, `beema_engine/lint.py` | Pattern gate. `library_report*.json` = per-component results (organic and ad) |
| `beema_engine/{tts,compose,render,captions}.py` | Voice, package build, Remotion call, per-platform captions |
| `registry/registry.json` | Every video, components, compliance sign-off, sources, costs, organic + ad metrics, labels. `recommendations.md` is generated |
| `beema_engine/{planner,daily,slack}.py`, `scheduler/` | Daily plan, idempotent job, Slack transports, launchd template |
| `../pde5-explainer/src/engine/` | Data-driven Remotion composition (`Clip9x16`, `Clip4x5`, `Clip1x1`) |
| `tools/check_voice.py` | Transcribes a composed video's `voice.wav` with Whisper and prints SAID vs HEARD per segment. Run after every compose (drug names, numbers, URLs). Needs `transformers`; first run downloads ~290 MB |
| `../pde5-explainer/src/engine/{story3d,scenes3d,three}.tsx` | Narration-synced 3D scenes (word-cued metaphor animations), the 3D honeycomb backdrop, `Chain3D`. See the skill's "Script and animation design" |
| `tests/` | 33 pytest tests (`python -m pytest shorts/engine/tests`) |

## Commands
```
beema library build|lint|stats          # build IDs/metadata; lint all 3,750 pieces for organic AND ad
beema compose --product tadalafil --hook TAD-H02 --meat TAD-M1 --cta TAD-C1 [--format ad] [--aspect 4x5] [--mints] [--preview] [--stills 1,5,12]
beema plan [--date D]                    # what the daily job would make
beema daily [--dry-run] [--no-deliver]   # plan -> gate -> render -> registry -> Slack. Idempotent per date
beema daily confirm --date D delivered|failed   # resolve an unconfirmed send
beema registry list|signoff ID --by NAME|mark ID --label winner|import-metrics FILE.csv|recommend
beema times                              # posting times (placeholders until metrics exist)
beema voices                             # render sample lines in candidate voices to compare by ear
beema check-prices                       # products.json amounts vs src/lib/simple-treatment-pricing.ts
beema deliver ID [--dry-run]             # post an existing package to Slack
beema nightly [--date D] [--dry-run] [--no-deliver] [--count N]   # 04:00 job: search demand -> 2 videos (15-45 s) -> gate -> render -> Slack. Idempotent per date
beema nightly confirm --date D --index N delivered|failed        # resolve an unconfirmed send
```

## Metric CSV for `registry import-metrics`
`video_id,platform,kind,posted_at,url,views,impressions,hook_rate_3s,avg_watch_s,avg_watch_pct,completion_rate,likes,comments,shares,saves,clicks,spend,ctr,cpc,lp_cvr,qualified_leads,cpql,customers,cac,revenue,roas,notes`
`kind` is `organic` or `ad`. Blank cells are ignored (nothing is invented). Rows for unknown video IDs are skipped and reported.

## Setup and credentials
- Python venv already has Kokoro, torch, requests, pytest. Node deps in `shorts/pde5-explainer` (Remotion 4, fonts).
- **Slack:** set `config.json` -> `daily.slack_channel_id` (Matt chooses the channel). Transport order: `SLACK_BOT_TOKEN` (scopes `chat:write`, `files:write`; put it in git-ignored `shorts/engine/.env`) -> headless `claude -p` using the Slack connector -> manual. Without a channel the job stops at "ready for manual delivery".
- **Scheduling:** `scheduler/com.beemahealth.daily-video.plist` (8:30 local) is written but NOT installed. To install: `cp` it to `~/Library/LaunchAgents/` and `launchctl load` it. The Mac must be awake/logged in. Logs: `state/daily.log`.
- **Optional better voice:** ElevenLabs adapter exists (`voice.provider="elevenlabs"`, `ELEVENLABS_API_KEY`, `voice.elevenlabs.voice_id`). UNTESTED (no key here).
- Nothing in the repo contains credentials. `.env`, `state/`, `out/`, `.cache/` are git-ignored.

## Operating cost
Local Kokoro TTS and local Remotion rendering: $0 marginal. Measured: a 40s 1080x1920 video renders in about 13s; TTS about 9s uncached, instant when cached (sentence-level cache in `.cache/tts`). ElevenLabs would be roughly characters-based (a 40s video is about 570 characters). Slack and Claude Code usage depend on your plan; the headless Slack transport uses a short `claude -p` call.

## Safety design
- Statuses: `BLOCKED` (cannot ship, daily job sends a failure notice, no video), `NEEDS_HUMAN_REVIEW`, `AUTO_CHECKS_PASSED`. None is "approved"; sign-off is a human action recorded in the registry.
- Daily job: file lock, atomic state, delivery marked `sending` before the send and `delivered` after. If a send may have landed but is unconfirmed, it refuses to resend and asks a human (`daily confirm`). Render retried 3x with backoff; failures notify instead of delivering.
- No auto-posting anywhere. No ad-account writes anywhere.

## Known limitations (read before relying on this)
1. **No real footage or UGC.** The engine uses brand graphics, animated diagrams and real product photos. Authentic B-roll needs Matt-supplied clips plus releases (`UGC Legal docs` exist; the engine does not use them). There is no music bed (no licensed track available).
2. **Tablet photos are off** (labels show "Generic Cialis/Viagra"). Videos show the Beema mark instead. Provide label-clean photos or approve the labeled ones to change this.
3. **Voice is Kokoro (local).** Better than the earlier cut and uses per-sentence pace/pause variation, but it is still synthetic. Voice quality was not auditioned by the engine; run `beema voices` and pick by ear, or set up ElevenLabs.
4. **Compliance gate is pattern-based.** It catches known-bad phrasing, price mismatches and missing disclosures; it cannot judge implied claims or imagery. It is not legal advice.
5. **ED Mints timing** is page wording ("about 30 minutes, provider confirms"); the pharmacy formulary PDF was not machine-read, and the "30 to 60 minutes" figure is unverified. Mints videos are flagged for review.
6. **Posting times are placeholders** until platform insights are imported; no social analytics API is connected. Meta Ads data is available via the connector but organic IG/TikTok/YouTube metrics are manual CSV.
7. **TikTok** prescription-ad policy is unresolved (sources conflict). Meta and Google need their own authorizations beyond LegitScript.
8. Phase 2/3 planning is implemented and unit-tested against synthetic data only; it has never run on real metrics.
9. The `claude-cli` Slack transport and ElevenLabs adapter have not been exercised end to end.
10. Platform-specific revisions beyond aspect ratio (9:16, 4:5, 1:1) and city-specific variants are not generated automatically: city goes in campaign metadata, not in the library.

## Nightly job (04:00)
`beema_engine/{nightly,demand,topics,generate,storyboard,topic_log}.py` + `topics.json` + `topics/topic_log.json`, scheduled by `scheduler/install.sh`. Every video is WRITTEN NEW each night (never assembled from the library):
1. **Discover:** Google autocomplete per product term (weight loss: tirzepatide, semaglutide; men's sexual health: sildenafil, tadalafil, ED Mints; peptides: BPC-157), scored by facet. Autocomplete order is a popularity PROXY, not search-volume data; brand names are search terms only. If every request fails the job says "offline" and uses a flat baseline.
2. **Choose:** two products from different categories first (one weight loss + one men's health). Peptides (education only) get one night in `nightly.peptide_at_least_every_nights` (4), second slot only.
3. **Write:** headless `claude -p` writes a fresh script and storyboard for ONE specific searched question that is not in the topic log. The storyboard uses the generic stage engine (`stage3d`): actors and actions, every action fired on a spoken word. `storyboard.py` rejects a script whose animation does not match its narration; `topic_log.py` rejects a repeat or a rewrite of existing text; failures go back to the writer with exact errors.
4. **Gate + length:** compliance gate (BLOCKED goes back to the writer), voice, REAL duration must be 15-45 s (else the writer is asked to cut or add words), render.
5. **Peptide guard:** the gate BLOCKs any peptide video with a link, brand mention, price, provider/prescribing words or a call to act (`peptide_ad_like`).
6. **Log + deliver:** each topic is added to `topics/topic_log.json` (+ `.md`); each video goes to `daily.slack_channel_id` as a DRAFT with captions, the written script, the question answered, search evidence, review items. Delivery is recorded before/after and never blindly resent. Nothing is published.
Review modes: `nightly --dry-run` (topics only) and `nightly --script-only` (writes and validates scripts) touch no state, send nothing. `beema.py topics log|seed` shows/backfills the log.
Install (once): `bash shorts/engine/scheduler/install.sh` (also `uninstall`, `status`, `run-now`). It schedules 04:00 daily via launchd -> Terminal -> a wrapper outside `~/Documents` -> `scheduler/run_nightly.sh`. Why Terminal: macOS blocks background launchd jobs from READING anything under `~/Documents` ("Operation not permitted", exit 127; found by testing), and Terminal already has that access (alternative: give `/bin/zsh` Full Disk Access and run `run_nightly.sh` directly). A Terminal window opens in the background at 04:00. The Mac must be awake and logged in at 04:00: `sudo pmset repeat wakeorpoweron MTWRFSU 03:55:00` wakes it. `run-now` is safe: the job is idempotent per date. Slack delivery uses the headless `claude -p` Slack connector (verified working) unless `SLACK_BOT_TOKEN` is set in the git-ignored `shorts/engine/.env`. Logs: `state/nightly.log`, `state/nightly.json`.
Limits: the writer can only animate what the stage catalog can draw (about 30 actor kinds), so compositions are simpler than our hand-built metaphor scenes; it is limited to the claims in `claims.json` plus new claims it proposes (always flagged for review); price, dosage, timing and results searches are never turned into videos.

## Nightly videos must not look alike (2026-11-17)
`beema_engine/styles.py` draws a random creative brief per video (voice, palette, caption style, hook style, structure, visual world, price-or-education) avoiding recent choices; `generate.build_prompt` is blind to all existing videos; the hook is its own 3D picture; the brand palette, logo and hero appear only on the end card; about 1 in 3 non-peptide videos states a repo price in the closing line. See the skill `beema-organic-video`, section "EVERY VIDEO IS NEW".
