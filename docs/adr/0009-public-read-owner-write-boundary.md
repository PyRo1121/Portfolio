# ADR 0009: Public reads with an Access-protected owner route

## Status

Accepted

## Context

Weeknote originally placed the entire `gh.latham.cloud` hostname behind Cloudflare Access. The owner has explicitly chosen to publish the complete dashboard, including evidence collected from private GitHub repositories, Career records, project mappings, and Cloudflare account evidence. Canonical GitHub links still apply GitHub's own repository authorization.

Making the root hostname public must not make D1 mutations public. An unprotected request can also supply arbitrary request headers, so the application cannot treat the mere presence of Access-shaped headers on the public route as authorization.

## Decision

- `https://gh.latham.cloud/` is publicly readable.
- Public reads remain server-rendered from authenticated provider collectors and owner-scoped D1 records. Provider credentials never enter application responses.
- `https://gh.latham.cloud/owner` is the editing surface and remains protected by Cloudflare Access for exactly `olen@latham.cloud`.
- Every Career and owner-project mutation requires both:
  1. the exact `/owner` request path; and
  2. the Access assertion plus normalized configured owner email.
- The root route may render editing controls, but submissions from the public route fail closed at the server boundary.
- The Markdown portfolio export is public because its existing allowlist includes only `ShareDraft` stories and server-verified evidence.
- Responses remain `private, no-store`; provider snapshots continue to use isolated, versioned KV caches.

## Consequences

- Visitors can inspect all currently rendered Weeknote evidence without a Cloudflare login.
- Private GitHub repository links may lead visitors to GitHub's authentication or not-found boundary.
- The owner uses `/owner` when changing Career or project-registry records.
- Removing or misconfiguring the `/owner` Access application cannot authorize writes because the server still requires both the protected path and exact Access identity evidence.
