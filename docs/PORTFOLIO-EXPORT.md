# Sanitized portfolio export contract

The Career Story Bank can download an owner-only Markdown draft from `/career/portfolio.md`. Cloudflare Access protects the hostname, and the endpoint independently requires the exact configured owner email plus an Access assertion.

## Explicit inclusion

A story is eligible only when its D1 `visibility` is exactly `ShareDraft`. The adapter filters to ShareDraft rows in SQL, and the pure serializer filters again before rendering.

The export allowlist is:

- story title;
- problem;
- action;
- outcome;
- server-verified GitHub artifact title, repository, kind, occurrence time, and canonical HTTP(S) URL.

A submitted evidence URL is untrusted. The Career action resolves it by exact match against shipped releases, merged pull requests, or closed issues in the current Live GitHub cache. Workflow runs and Demo artifacts cannot be selected. The canonical artifact metadata is then stored transactionally in `career_story_evidence`, so an association remains auditable after the artifact leaves the rolling dashboard window.

User-authored Markdown and HTML control characters are escaped. A pre-existing free-form URL without an association row is rendered privately as **Unavailable** and its URL is excluded from the export. Malformed associated URLs are also omitted.

## Explicit exclusion

The export never reads or renders:

- stories marked `Private`;
- owner email or Access identity;
- opportunities, contacts, résumé versions, next actions, or private notes;
- build or Career commitments;
- stage history;
- GitHub, Cloudflare, or Access credentials.

The generated file identifies itself as a draft and instructs the owner to review it before sharing. Marking a story ShareDraft is an export decision, not publication; the endpoint remains private and produces no public URL.

## HTTP behavior

Successful downloads use `text/markdown`, an attachment filename, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, and a restrictive Content Security Policy. Denied and failed responses also use `private, no-store` and `nosniff`.
