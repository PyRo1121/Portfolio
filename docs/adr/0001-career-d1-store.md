# ADR 0001: Dedicated D1 store for private career accountability

## Status

Superseded in part by [ADR 0009](0009-public-read-owner-write-boundary.md) and [ADR 0010](0010-public-portfolio-owner-ops-read-boundary.md). The dedicated store and owner-scoped mutations remain accepted. Career record **reads** are owner-only on `/owner`; they are withheld from public `/`. The Markdown ShareDraft export at `/career/portfolio.md` remains public.

## Context

Weeknote already had two persistence capabilities: a versioned KV cache for GitHub snapshots and a separate versioned KV cache for Cloudflare evidence. Neither is a suitable owner for mutable opportunities, stage history, commitments, or interview stories. Those records need relational constraints, owner-scoped queries, transactional stage events, and future migrations.

## Decision

Use a dedicated `weeknote-career` D1 database behind the `CAREER_DB` binding. Keep GitHub and Cloudflare caches unchanged. Enforce the exact Cloudflare Access identity before every read or mutation, then scope every query by the normalized owner email.

The initial migration owns four cohesive tables:

- opportunities;
- append-only stage events;
- build/career commitments;
- interview story drafts.

Expected D1 and parsing failures remain typed values at the server boundary. The browser receives only owner-scoped domain records and never receives Access assertions, API tokens, or provider credentials.

## Consequences

- Career mutations cannot invalidate GitHub or Cloudflare evidence.
- D1 migrations become the durable compatibility mechanism.
- Production requires the exact-owner Access policy and `CAREER_OWNER_EMAIL` configuration.
- A future public/share surface must use a separate sanitized reader rather than exposing private rows directly.
