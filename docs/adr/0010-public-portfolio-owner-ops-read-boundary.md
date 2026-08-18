# ADR 0010: Public portfolio and owner-ops read boundary

## Status

Accepted. Supersedes [ADR 0009](0009-public-read-owner-write-boundary.md) for Career, Cloudflare usage, and visitor telemetry **reads**. The `/owner` mutation rule from ADR 0009 remains in force.

## Context

ADR 0009 published the complete dashboard, including Career records, Cloudflare account evidence, and visitor telemetry. Access only gated writes, so a stranger on `latham.cloud` could inspect job-search state, account usage, and visit analytics. That crowding fought the public promise: show that the owner ships.

## Decision

- `https://latham.cloud/` is a public engineering portfolio of Today, Week, Delivery, Quality, Projects, and Commits. Public Projects may show confirmed GitHub, Worker, and domain shipping links. Public responses omit Career records, Cloudflare usage and inventory, visitor telemetry, D1/KV/R2 inventory, deployment operator identity, Access-session flags, and the raw owner-project registry.
- `/` stays the public portfolio even when Access cookies are present. Public load does not call Access identity resolution to enrich the payload.
- `https://latham.cloud/owner` is a distinct Access-protected owner home. It lands on a Career briefing and opens Career, Cloudflare usage, Visitors, and mapping edits. Denied GET throws `error(403)` before private reads.
- Career, Cloudflare usage, visitor telemetry, and mapping mutations still require both the `/owner` path and the configured Access identity.
- `/career/portfolio.md` remains the public ShareDraft export.

## Consequences

- Inspecting public HTML or PageData cannot reveal owner-ops records.
- The owner reviews shipping on `/` and private ops on `/owner`.
- Mapping writes stay on `/owner`; public Projects stays read-only.
- ADR 0001 and ADR 0007 “reads are now public” notes no longer apply to Career records or the raw owner-project snapshot.
