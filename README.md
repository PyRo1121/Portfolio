# Weeknote

Weeknote is Olen Latham’s public engineering portfolio and evidence dashboard. It connects GitHub activity to delivery records, deployments, Cloudflare infrastructure, and explicit data limits instead of reducing the work to a contribution count or synthetic score.

Live at **[latham.cloud](https://latham.cloud)**.

## Public portfolio

- **[Portfolio](https://latham.cloud)** — Olen’s customer-service-to-technology story, selected work, live evidence summary, and direct contact paths.
- **[Live evidence](https://latham.cloud/evidence)** — current GitHub activity, delivery outcomes, workflow runs, repositories, and verified project mappings.
- **[About Olen](https://latham.cloud/about)** — the complete career-transition story and current role interests.
- **[OMG case study](https://latham.cloud/work/omg)** — the motivation, boundaries, and public evidence behind a Rust package and runtime management CLI.
- **[Weeknote case study](https://latham.cloud/work/weeknote)** — why the evidence dashboard exists and how its model was designed.

The public evidence dashboard includes:

- **Today / Week** — commits, additions, deletions, and activity rhythm presented in the viewer’s local timezone.
- **Delivery** — authored and maintainer outcomes, automated updates, releases, and GitHub Actions workflow runs with distinct attribution.
- **Checks** — latest default-branch workflow state, recovered failures, seven-day run history, and neutral change context without converting CI into a quality score.
- **Projects** — public project identities, canonical links, and deployment evidence linked only through exact provider identifiers.
- **Commits** — per-repository commit evidence, including private repositories through server-only credentials.

## Evidence boundaries

Weeknote uses literal states such as **Observed**, **Measured**, **Provisioned**, **No record**, and **Unavailable**. Missing provider evidence is not silently converted to zero, and a partial refresh cannot replace the last complete cached snapshot.

Important distinctions are preserved in collection and presentation:

- Automated pull requests do not count as maintainer work or headline delivery outcomes.
- A local merge is not presented as a pull request without a canonical GitHub record.
- A Worker deployment can truthfully have no Workers Build record.
- Browser sessions and Cloudflare edge visitors remain separate measurements.
- Public project data is allowlisted independently from owner-only records.

## Owner and privacy boundary

`/owner` is protected by Cloudflare Access with cryptographic JWT verification. It contains career records, Cloudflare usage, project mappings, visitor telemetry, and recruiter-action totals that are not part of the public payload.

Public telemetry is cookieless and bounded. It records navigation, selected-work and evidence actions, browser performance, normalized errors, and explicit contact-link actions without storing raw IP addresses, contact message content, or visitor identity. A click is reported only as an observed action—not proof that a case study was read or that a message was sent.

## Architecture

Svelte 5 · SvelteKit · TypeScript · Effect · Cloudflare Workers · Durable Objects · D1 · KV · GitHub GraphQL and REST APIs · ECharts · Vitest

The application uses:

- Effect Schema at untrusted API, persistence, form, and telemetry boundaries.
- Incremental per-repository collection with independently cached slices.
- A scheduled warming Worker and a service-only Durable Object coordinator.
- Separate failure boundaries for GitHub, Cloudflare, deployments, career records, project registry, telemetry, and refresh coordination.
- Exact Git SHA deployment metadata and a release gate that checks the tree, CI, and D1 migrations before deployment.

Architecture decisions are recorded in [`docs/adr`](docs/adr).

## Run locally

```bash
cp .env.example .env
npm ci
npm run db:migrate:local
npm run dev
```

Set `GITHUB_USERNAME` in `.env`. Keep credentials outside the repository tree or in a credential manager. The local credential-file convention is:

- `~/.config/weeknote/github-token` — mode `0600` fine-grained PAT.
- `~/.config/weeknote/github-checks-app.pem` — mode `0600` PKCS#8 key for the Checks GitHub App.

Private repositories owned by another GitHub resource owner use the optional `GITHUB_ORGANIZATION_REPOSITORIES` exact allowlist and a separately scoped read-only `GITHUB_ORGANIZATION_TOKEN`. Both values are required together. In production, store the token only through `wrangler secret put GITHUB_ORGANIZATION_TOKEN`; never commit it or pass it as a command argument.

## Verification

Use targeted checks while developing:

```bash
npm test -- path/to/focused.test.ts
npm run check
npm run lint
```

The complete repository gate is:

```bash
npm run ci
```

## Deployment

```bash
npm run deploy
```

The deployment script requires a clean tree, runs CI, verifies both D1 migration sets, and deploys the coordinator, main application, and warming Worker with exact Git metadata.
