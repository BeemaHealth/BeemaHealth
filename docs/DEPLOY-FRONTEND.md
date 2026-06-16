# Deploy frontend to GitHub Pages (aretide.com)

The marketing site and patient intake UI are **static files** built from `dist/client/` and published to the `gh-pages` branch.

After one-time setup below, deploy with:

```bash
./deploy-frontend-prod.sh
```

---

## What gets deployed

| Item | Detail |
|------|--------|
| Build | `npm run build` (Vite + TanStack Start static prerender) |
| Output | `dist/client/` |
| Host | GitHub Pages (`gh-pages` branch) |
| Domain | `aretide.com` (custom domain) |
| Backend | **Not** included — API stays on separate hosting ([backend/HOSTING.md](../backend/HOSTING.md)) |

---

## One-time setup

### 1. GitHub repository

Repo: **https://github.com/Aretide/Aretide**

You need **push access** to `origin`.

### 2. Local production env

```bash
cp .env.production.example .env.production
chmod +x deploy-frontend-prod.sh
```

Edit `.env.production` when your API is live:

```bash
VITE_API_URL=https://api.aretide.com/api
```

Until the backend is deployed, leave `VITE_API_URL` unset.

### 3. First deploy (creates the `gh-pages` branch)

The `gh-pages` branch **does not exist yet** — that is normal. It is created the first time you run:

```bash
./deploy-frontend-prod.sh
```

This builds the site and pushes `dist/client` to a new `gh-pages` branch on GitHub. You should see it appear under **Code → branches** afterward.

### 4. Enable GitHub Pages (after step 3)

1. Open **GitHub → Aretide/Aretide → Settings → Pages**
2. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages` / `/ (root)` — only available after step 3
3. Click **Save**

### 5. Custom domain on GitHub

1. Still on **Settings → Pages**
2. Under **Custom domain**, enter: `aretide.com`
3. Click **Save**
4. Wait for DNS check (can take up to 24 hours; often minutes)
5. Enable **Enforce HTTPS** once the certificate is issued

### 6. DNS at your domain registrar

Point `aretide.com` to GitHub Pages.

**Apex domain (`aretide.com`)** — add **A** records:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

**Optional `www`** — add a **CNAME** record:

| Type | Name | Value |
|------|------|-------|
| CNAME | `www` | `aretide.github.io` |

If you use `www`, add `www.aretide.com` as an additional custom domain in GitHub Pages settings and set your registrar to redirect apex → www (or vice versa).

Official reference: [GitHub — Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

---

## Deploy (every release)

```bash
./deploy-frontend-prod.sh
```

The script:

1. Loads `.env.production`
2. Runs `npm ci` and `npm run build`
3. Prepares `index.html`, `404.html`, `CNAME`, and `.nojekyll`
4. Pushes `dist/client` to the `gh-pages` branch

Verify:

- https://aretide.com
- https://aretide.github.io/Aretide/ (works before DNS propagates)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Failed to start the Vite preview server for prerendering` | Re-run build locally with network access; prerender starts a short-lived preview server |
| Site shows old content | Hard refresh; GitHub Pages can take 1–3 minutes |
| Custom domain not verified | Check DNS A records; wait up to 24h |
| `/admin/xyz` 404 | `404.html` SPA fallback should load the app — confirm it exists on `gh-pages` |
| API calls fail in production | Set `VITE_API_URL` in `.env.production` and redeploy; configure backend CORS for `https://aretide.com` |

---

## Related docs

- [../README.md](../README.md) — project index
- [../backend/HOSTING.md](../backend/HOSTING.md) — backend / PHI hosting (separate from this static frontend)
