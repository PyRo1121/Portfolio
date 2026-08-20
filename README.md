# Portfolio

Personal engineering portfolio and GitHub activity dashboard, built with Svelte 5. It turns weekly GitHub engineering activity, delivered outcomes, Cloudflare account evidence, and career accountability into a keyboard-navigable, viewport-contained workbench.

Live at **[latham.cloud](https://latham.cloud)**.

## Views

- **Today / Week** — exact commit history, additions, deletions, and rhythm, reprojected into your local timezone
- **Delivery** — merged work, releases, and GitHub Actions verification
- **Quality** — checks, reverts, and change-mass signals
- **Projects** — public project identities, canonical links, and exact deployment evidence
- **Commits** — per-repository commit evidence
- **/owner** — Cloudflare Access-protected career records, Cloudflare usage, visitor telemetry, and mapping edits

## Tech stack

Svelte 5 · SvelteKit · Cloudflare Workers · D1 · KV · GitHub GraphQL · Playwright

## Run it locally

```bash
cp .env.example .env
npm ci
npm run db:migrate:local
npm run dev
```

Set `GITHUB_USERNAME` in `.env`. Keep GitHub credentials outside the repository tree or in a credential manager:

- `~/.config/weeknote/github-token` — mode-`0600` fine-grained PAT (private engineering evidence)
- `~/.config/weeknote/github-checks-app.pem` — mode-`0600` PKCS#8 key for a private GitHub App (Checks: read, Metadata: read)

## Deploy to Cloudflare

```bash
npm run cf:types
npm run deploy
```

The production app runs as the `weeknote` Worker at `https://latham.cloud`. Rotate credentials with `wrangler secret put` — never commit credential values to `wrangler.jsonc`. A `weeknote-warm` scheduled Worker refreshes GitHub and Cloudflare snapshots every 10 minutes. The service-only `weeknote-refresh-coordinator` Worker uses SQLite-backed Durable Object leases to serialize snapshot publication across edge isolates.

## Data & evidence model

- One canonical rolling seven-day UTC collection window, compared against the preceding seven UTC days.
- Commit and churn totals come from commits reachable from each owned repository's current default branch.
- Verification totals include only default-branch push/dispatch runs; checks use a least-privilege GitHub App.
- Cloudflare inventory is labeled **Provisioned**/**Measured** only after successful API reads; gaps remain **Unavailable**, never zero.
- Career records live in a dedicated D1 database, scoped to the owner email, owner-only on `/owner`, with dated evidence transitions.
- Private responses use `Cache-Control: private, no-store`; private data is never placed in a shared HTTP cache.

See `docs/` for the full accountability review, export, and evidence roadmap.
