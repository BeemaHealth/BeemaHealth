---
name: cove-board-bug-filer
description: File a bug into Matt's CoveBoard (cove_board) system by appending a properly-formed item to /Users/mattaertker/Documents/Github/.claude/state/items.json. Use this skill whenever Matt reports a bug, glitch, broken behavior, or issue in any of his local projects (Beema Health frontend/backend, cove_board itself, automation loop, etc.) and wants it logged/filed/tracked — e.g. "file a bug", "log this issue", "add this to the board", "post a bug to X", or pastes an error and says "make a bug for this". Also use when another agent or automation needs to post a bug programmatically.
---
 
# CoveBoard Bug Filer
 
Turns a raw bug report from Matt into a schema-correct CoveBoard item and appends it to `items.json`. Schema is **CONFIRMED** against the live board (2026-07-07, schema_version 2.0.0). See companion skill **cove-board-reference** for full system knowledge.
 
**Requires access to Matt's Mac filesystem** — via Claude Code/Cowork locally, or in claude.ai chat via his Filesystem MCP connector (scoped to `~/Documents/Github`). No access → tell Matt to enable the Filesystem connector or run from Claude Code.
 
## Workflow
 
### 1. Read the board first — always
 
Read `/Users/mattaertker/Documents/Github/.claude/state/items.json` and `stories.json` before filing. You need this to: (a) **catch duplicates** — Matt sometimes files items himself via the CoveBoard UI; if a similar item exists, tell him and offer to enrich it instead; (b) pick the right `story_id` — e.g. Charlie's app-change requests belong under the story for Charlie's requested changes; Beema integration work under its story; (c) see current ID sequence and statuses.
 
### 2. Distill the report
 
- **title** — specific, ≤ 80 chars.
- **description** — plain prose, 1–4 sentences; include who requested it and why if known (e.g. "Charlie requested via iMessage Jul 7"). Preserve Matt's key wording.
- **priority** — CoveBoard uses P0–P3; default P2 (Matt's observed default). Escalate only if Matt signals urgency.
- **story** — link to an existing STORY-NNN when one fits; otherwise leave null and mention it to Matt (or offer to create a story — but story creation isn't automated here; CoveBoard UI or manual edit).
- **PHI rule (Beema Health):** never put patient-identifying data in items — plaintext on disk.
Echo the distilled fields to Matt in the same message you file.
 
### 3. File it
 
```bash
python3 scripts/file_bug.py \
  --title "..." --description "..." \
  --story STORY-003 --priority P2 --owner Matt
```
 
The script (schema-native, no guessing):
- assigns the next `BUG-NNN` id; sets type fields (`bug`/`Bug`/🐛/`#ef4444`), `workflow_status: backlog`, `board_order` after last item in that status, `closure: null`, `matt_approval_needed: false`;
- writes the initial `history` entry with CoveBoard's timestamp format (`%Y-%m-%dT%H:%M:%S%z`, local time);
- bumps the envelope `file_version` patch and sets `last_updated`/`updated_by`;
- **refuses near-duplicate titles** (similarity ≥ 0.75) unless `--force`;
- validates `--story` against stories.json and `--owner` against owners.json (warns, doesn't block);
- `--dry-run` to preview.
If running from a claude.ai chat with the Filesystem connector (no shell on the Mac): replicate the script's behavior manually — read items.json, construct the item exactly per the schema above, and write the whole file back (Filesystem write_file/edit_file). Never truncate or reorder existing items; append only, and keep the JSON valid.
 
### 4. Confirm
 
Report the new item ID, story linkage, and distilled fields — one tight confirmation.
 
## Guardrails
 
- Only append items; never delete or rewrite existing items, and never touch other state files (sprints.json, owners.json, stories.json) except reading — unless Matt explicitly directs an edit, in which case append a `history` entry describing the change with `field_changes`.
- Duplicate found → surface it, don't silently file or silently skip.
- Never `git push`; don't commit unless asked.
- No PHI or secrets in state files.