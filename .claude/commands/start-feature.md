# Start Feature

Run this command at the beginning of every new feature. It checks for existing work, stashes in-progress changes in the repo checkout, creates a feature branch, and defines the testing gate.

**Repo:** `/Users/mattaertker/Documents/Github/BeemaHealth` — one working copy; do not clone sibling directories.

---

## Step 1 — Check for existing feature branches

Before creating anything, check whether relevant work already exists.

**Check remote branches on GitHub:**
```bash
git -C /Users/mattaertker/Documents/Github/BeemaHealth ls-remote --heads origin | grep feature/
```

**Check local branches too — not just remote:**
```bash
git -C /Users/mattaertker/Documents/Github/BeemaHealth branch --list 'feature/*'
```

Local `main` can be ahead of `origin/main` (uncommitted work gets pushed in batches, not every session), so a branch or commits can exist locally with nothing on GitHub to show for it. Always check both.

Show the user what exists. If any branch looks related to the requested feature, ask:

> "I found existing branch(es) that may be relevant: `feature/xxx`. Would you like to continue work there instead of starting a new branch?"

Wait for the user to decide before proceeding. If they say yes, check out that branch instead of creating a new one. Offer to `git stash pop` if you stashed in Step 3 on a prior run and they want that work back.

---

## Step 2 — Propose a branch name

Read the feature request and propose a name in the format:

```
feature/<short-but-understandable-name>
```

Good examples: `feature/consent-flow-redesign`, `feature/refill-request-api`, `feature/staff-patient-notes`

The name should be specific enough to understand at a glance — not `feature/updates` or `feature/fix`.

Ask the user to confirm or adjust the name. Do not create the branch until they approve.

---

## Step 3 — Stash WIP and create the branch

Work in the single repo checkout. **Local `main` is the source of truth** — do not clone from GitHub (that can drop commits `origin/main` does not have yet).

```bash
cd /Users/mattaertker/Documents/Github/BeemaHealth

# Stash only if the working tree is dirty (tracked + untracked)
if [ -n "$(git status --porcelain)" ]; then
  git stash push -u -m "WIP before feature/<approved-name> ($(date +%Y-%m-%d))"
fi

git checkout main
git checkout -b feature/<approved-name>
```

Example for `feature/refill-request-api`:
```bash
cd /Users/mattaertker/Documents/Github/BeemaHealth
git stash push -u -m "WIP before feature/refill-request-api ($(date +%Y-%m-%d))"  # skip if clean
git checkout main
git checkout -b feature/refill-request-api
```

**Rules:**
- Use `git stash push -u` so untracked files are preserved.
- If stash fails, stop and tell the user — do not discard work.
- Do not run `git pull` unless the user asks; local `main` may intentionally be ahead of `origin/main`.
- If `feature/<approved-name>` already exists locally, stop and ask whether to check it out instead.

Confirm to the user: **"On branch `feature/<name>` in `BeemaHealth/`. Ready to start work."** If you stashed, note the stash message so they can recover it later with `git stash list` / `git stash pop`.

---

## Step 4 — Do the work

Follow the standard task workflow (`AGENTS.md`):
- Orient: read the relevant `docs/features/` doc; flag any discrepancies against the code before starting
- Implement with defense in depth — validators at every layer (UI → serializer → ORM)
- Commit logical checkpoints as you go — do not accumulate one giant diff
- Keep migrations in the same commit as the model changes that require them
- Never commit to `main`; no `--no-verify`

---

## Step 5 — Testing gate (required before declaring done)

**All of the following must pass. Report each result in chat.**

```bash
npm run test:all          # frontend (Vitest) + backend unit tests + smoke_clinical_flow
npx tsc --noEmit          # required when any TS/TSX changed — not optional
FILES=$(git diff --name-only --diff-filter=ACMR origin/main -- '*.ts' '*.tsx')
[ -n "$FILES" ] && echo "$FILES" | xargs npx eslint
```

- Fix all failures — do not skip or defer
- If new behaviour was added, write tests for it first, then confirm they pass
- Report: test count + pass/fail for each suite, `tsc --noEmit` result, ESLint result on changed files

---

## Step 6 — Hand off to the user

**Do not push. The user pushes when ready.**

When work is done and tests pass, say:

> "All tests pass on branch `feature/<name>` in `BeemaHealth/`. When you're ready to merge, push with:
> ```
> git push -u origin feature/<name>
> ```
> Then open a PR on GitHub."

Never run `git push`. Never open a PR without the user explicitly asking.
