# Weeknote — GitHub Activity Dashboard

A private-aware Svelte 5 dashboard for exploring weekly GitHub engineering activity, delivered outcomes, Cloudflare account evidence, and an exact-owner career accountability pipeline. It combines exact default-branch commit history, additions and deletions, repository inventory, merged work, releases, and GitHub Actions verification in a keyboard-navigable, viewport-contained workbench. Every workspace fits one screen; larger result sets use pagination rather than page scrolling.

## Run it

```bash
cp .env.example .env
npm ci
npm run dev
```

Set `GITHUB_USERNAME` in `.env`, but keep GitHub credentials outside the repository tree or in a credential manager. The mode-`0600` `~/.config/weeknote/github-token` fine-grained PAT reads private engineering evidence. The mode-`0600` `~/.config/weeknote/github-checks-app.pem` PKCS#8 key belongs to a private GitHub App with only **Checks: read** and mandatory **Metadata: read**. Both remain server-side.

## Cloudflare deployment

The production application runs as the `weeknote` Cloudflare Worker at `https://gh.latham.cloud`, protected by Cloudflare Access for the exact owner email. Static assets use Workers Static Assets; independently versioned GitHub and Cloudflare snapshots use `WEEKNOTE_CACHE`; mutable owner-scoped opportunities, commitments, and interview stories use the dedicated `CAREER_DB` D1 binding; `GITHUB_TOKEN`, `GITHUB_CHECKS_APP_PRIVATE_KEY`, and `CLOUDFLARE_API_TOKEN` are Worker secrets.

```bash
npm run cf:types
npm run deploy
```

Use `wrangler secret put GITHUB_TOKEN`, `wrangler secret put GITHUB_CHECKS_APP_PRIVATE_KEY`, or `wrangler secret put CLOUDFLARE_API_TOKEN` to rotate production credentials. Never add credential values to `wrangler.jsonc`. The non-secret GitHub App and installation IDs remain ordinary Worker variables. Keep the Access application and its exact-account-owner allow policy in place before attaching another hostname.

## Data model

- The shared private snapshot uses one canonical rolling seven-day UTC collection window, with the immediately preceding seven UTC days as its comparison window.
- After hydration, exact commit timestamps are reprojected into the viewer's browser-resolved IANA timezone. Today, daily/hourly rhythm, peak-hour labels, weekend grouping, Ledger dates, and timestamp labels therefore match the portfolio viewer's local calendar and clock.
- Commit and churn totals come from commits reachable from each owned repository's current default branch, filtered to the configured GitHub user.
- Commit additions, deletions, changed files, timestamps, and messages come from GitHub's `Commit` GraphQL object.
- Repository inventory includes private/public visibility, language mass, open issues and pull requests, stars, forks, and disk usage.
- Contribution memory uses GitHub's contribution calendar for the previous twelve months.
- Delivery outcomes deduplicate pull requests authored by the configured GitHub user with pull requests that user merged in owned repositories, regardless of whether a person or automation created them. The UI separates authored, maintainer, and automated merges.
- Closed issues are deduplicated across issues authored by the configured user, issues that user closed in owned repositories, and issues closed by a pull request that user merged. Non-draft repository releases remain eligible outcomes; stable releases and prerelease builds remain separate.
- Verification uses authenticated GitHub Actions runs on active repositories' default branches, attributed to the configured GitHub user. Coverage gaps and result truncation are exposed.
- Today uses the viewer-local date at snapshot generation time and derives exact hourly, repository, commit, and change-mass signals from the collected commit evidence.
- Craft separates observed evidence (checks, reverts, files, change size) from commit-message inference (feature/fix/refactor/test/docs mix). Missing coverage, code-scanning, and normalized lint evidence is explicitly labeled unavailable.
- The delivery signal is transparent: up to 56 outcome points, 34 verification points, and 10 coverage points.
- Live snapshots use a versioned server-only cache envelope: Cloudflare KV in production and Wrangler's local KV emulation in development. The PAT is never cached.
- Cached private data renders immediately while one single-flight background refresh runs. On Cloudflare, warm refreshes use the execution context so the document response can close immediately.
- If GitHub is temporarily unavailable, Weeknote keeps the last-known-good live snapshot and labels it cached. Demo intelligence is used only when authentication is absent; a first authenticated cold start shows a skeleton until a verified snapshot is available.
- Private dashboard responses use `Cache-Control: private, no-store`; private repository data is never intentionally placed in a shared HTTP cache.
- GitHub GraphQL collection uses a small account query, an isolated search/outcome query, and independently cached per-repository slices refreshed at concurrency six with a 15-second request timeout. A failed repository may reuse only same-window last-known-good evidence; without a matching slice, the full refresh fails and preserves the prior dashboard snapshot.
- Repository collection health shows oldest retained-slice age and sums GitHub-returned point cost across successful account, search, repository, and pagination responses. Any fallback makes total cost **Unavailable** while preserving the known successful-response lower bound.
- Verification totals include only default-branch push/dispatch runs. Actions jobs use the fine-grained PAT; bounded, job-linked check annotations use a one-hour token minted from a private least-privilege GitHub App. Authentication or permission gaps remain **Unavailable** and never become an inferred failure cause.
- Cloudflare inventory counts are labeled **Provisioned**; Workers, D1, and KV analytics and D1 physical storage are labeled **Measured** only after a successful API read. Permission gaps and unsupported response shapes remain **Unavailable**, never zero.
- Cloudflare collection has a separate cache envelope and refresh lifecycle, so Cloudflare failures cannot replace or invalidate GitHub evidence.
- Career records are stored in a dedicated D1 database, scoped by the exact normalized Access owner email, and parsed server-side before every mutation. Stage transitions append dated evidence rather than overwriting history silently.
- The Career workspace opens on a decision-first Accountability Review, then exposes deliberate opportunities, editable private context, one build and one job-search commitment, and private or sanitized interview story drafts. Due-date reminders are derived in the dashboard each viewer-local day; Weeknote does not claim an external notification was delivered or reward application spam.
- Accountability Review selection, evidence states, and inference limits are documented in [`docs/ACCOUNTABILITY-REVIEW.md`](docs/ACCOUNTABILITY-REVIEW.md).
- Story edits remain owner-scoped. GitHub links become Observed only after exact server-side matching to a retained Live outcome and durable D1 association; legacy links remain Unavailable. The Markdown export includes only records explicitly marked `ShareDraft`. Its allowlist and exclusions are documented in [`docs/PORTFOLIO-EXPORT.md`](docs/PORTFOLIO-EXPORT.md).
- Future evidence-backed improvements and their formulas are tracked in [`docs/EVIDENCE-ROADMAP.md`](docs/EVIDENCE-ROADMAP.md).

## Navigation

- `1` — Today
- `2` — Week
- `3` — Delivery
- `4` — Quality
- `5` — Repositories
- `6` — Commits
- `7` — Cloudflare
- `8` — Career
- `Ctrl/⌘ + K` — command palette

## Checks

```bash
npm run ci
npm run deploy:dry-run
```
