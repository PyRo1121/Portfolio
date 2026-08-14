# ADR 0002: Durable observed evidence for Career stories

## Status

Accepted.

## Context

Career stories outlive the dashboard's rolling GitHub evidence window. Storing only a user-entered URL cannot prove that the link represented a retained delivery outcome, while rechecking only the current seven-day cache would make previously valid portfolio evidence disappear.

## Decision

Story forms offer only shipped releases, merged pull requests, and closed issues from the current Live GitHub snapshot. Demo artifacts, workflow runs, failed artifacts, and arbitrary URLs are excluded.

The server treats the selected URL as untrusted and resolves it by exact match against the cached snapshot. It persists the canonical artifact kind, title, repository, URL, occurrence time, and observation time in the owner-scoped `career_story_evidence` table. Story mutation and association replacement run in one D1 `batch()` transaction. Cloudflare documents that batched statements execute sequentially and roll back the sequence when a statement fails: <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>.

Existing `career_stories.evidence_url` values remain readable for durable-data compatibility but map to **Unavailable** without an association row. They are never exported as Observed links. Selecting no outcome clears both the compatibility URL and association.

## Consequences

- A story retains the exact evidence that was observed even after the artifact leaves the rolling dashboard window.
- Injected form URLs cannot create evidence associations.
- Account-level Cloudflare evidence is still not attributed to a GitHub artifact.
- The association proves that GitHub reported the artifact as a retained outcome at `observed_at`; it does not prove production deployment, business impact, or hiring relevance.
