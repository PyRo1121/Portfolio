# ADR 0003: Incremental GitHub repository refresh

## Status

Accepted.

## Context

The authenticated GraphQL core query requested contribution calendars plus metadata, releases, and authored default-branch history for every repository in the account inventory. GitHub intermittently returned `504`, and successful core requests took approximately eight seconds. One repository failure invalidated the entire query and prevented independent recovery.

## Decision

Collection is split into:

1. one account query for contribution calendars and rate limits;
2. one primary search query plus one disjoint search query per explicitly allowlisted organization repository;
3. one query per REST-observed repository for metadata, releases, and default-branch history.

The primary REST inventory includes repositories affiliated through ownership, direct collaboration, or organization membership. This preserves authored evidence when a public repository transfers from the personal account into an organization and automatically follows later public organization-level splits. Private repositories owned by a different GitHub resource owner require an independently scoped read-only credential paired with an exact repository allowlist. Partial or malformed secondary configuration fails the fresh collection instead of silently publishing an undercount.

The secondary credential must authenticate as the configured dashboard user. Its repository metadata, commit, release, Actions, and Checks requests use that repository's credential. Primary searches explicitly exclude secondary repositories; secondary searches use exact `repo:` scopes and broaden maintainer candidates only within that repository before applying the existing author, merger, and closer attribution filters. This keeps search sets disjoint and avoids relabeling teammates' work. Repository commit queries continue to filter by the authenticated author's immutable GitHub node ID.

Repository queries run with fixed concurrency six. Every GraphQL request has a 15-second abort timeout. Commit histories exceeding the first 100 nodes retain the existing repository-specific pagination.

Each repository result is parsed into a versioned server-only KV envelope containing repository metrics, current-window releases, previous release count, and exact authored commits. One key per username/repository is overwritten on later windows; the envelope records canonical UTC start/end boundaries and rejects unknown forward versions.

A failed repository query can use cached evidence only when username, repository, window start, and window end all match exactly. The dashboard marks collection **Unavailable** and lists retained stale repositories. If no matching slice exists, the repository collector fails, allowing the existing full-snapshot cache to retain the previous last-known-good dashboard instead of publishing a partial undercount.

Repository-slice storage failure does not invalidate successfully parsed upstream evidence. It returns an explicit persistence result and leaves full-snapshot retention as the durable fallback. Credentials are never written to either cache.

## Consequences

- One slow repository no longer forces a large GitHub core query to time out.
- Same-window failures recover at repository granularity without mixing reporting windows.
- Cold collection issues more GraphQL operations, bounded to six concurrent repository requests and three concurrent search requests.
- Live cold-cache verification across 25 repositories reduced the account query to roughly 0.6 seconds; the slowest repository slice was roughly 1.7 seconds, with approximately 8.4 seconds for the complete REST, GraphQL, pagination, and Actions pipeline.
- Collection health now retains the oldest same-window stale timestamp and sums GitHub-returned query costs across successful account, search, repository, and pagination responses. A failed request makes the total **Unavailable** because no cost was returned, while known successful-response points remain disclosed.
- Adding a private organization repository requires an allowlist change and credential authorization; broad organization discovery is intentionally rejected.
