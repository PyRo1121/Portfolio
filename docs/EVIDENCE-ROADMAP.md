# Weeknote evidence roadmap

Research date: 2026-08-13

Weeknote should remain decision-first: show one decisive signal on entry, then expose exact evidence through progressive disclosure. New metrics must preserve the existing observed / inferred / unavailable contract.

## Priority 1 — delivery flow

### Pull-request lead time — Measured

- Formula: median(`mergedAt - createdAt`) for authored pull requests merged in the rolling window.
- Evidence: each pull request and its GitHub URL.
- Why: distinguishes delivery throughput from commit volume.
- Source: [GitHub GraphQL PullRequest reference](https://docs.github.com/en/graphql/reference/objects#pullrequest).

### First-review latency — Measured when reviews exist

- Formula: median(`first review submittedAt - pull request createdAt`) for authored pull requests receiving a review.
- State is **Unavailable**, not zero, when no accessible review timestamp exists.
- Source: [GitHub GraphQL PullRequestReview reference](https://docs.github.com/en/graphql/reference/objects#pullrequestreview).

### Deployment frequency — Measured only for repositories using GitHub Deployments

- Formula: successful production deployments in the rolling window.
- Do not treat releases or workflow runs as deployments unless repository configuration explicitly maps them.
- Source: [GitHub GraphQL deployments reference](https://docs.github.com/en/graphql/reference/objects#deployment).

### Release cadence — Measured

- Continue separating stable releases from prereleases; add median interval only when at least two releases exist.
- Source: [GitHub GraphQL releases reference](https://docs.github.com/en/graphql/reference/objects#release).

## Priority 2 — verification depth

### Workflow duration — Measured

- Formula: median(`completed_at - started_at`) for completed default-branch jobs, split by conclusion.
- Preserve failed, cancelled, and successful distributions instead of one blended average.
- Source: [GitHub REST workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs).

### Failed-step evidence — Measured

- Collect failing job steps and timestamps for recent failed default-branch runs.
- Link directly to the run; never infer root cause from a step name.
- Source: [GitHub REST workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs).

### Check annotations — Measured when accessible

- Surface warning/failure annotation counts and a bounded sample of file/line evidence.
- Access and code-scanning gaps remain **Unavailable**.
- Source: [GitHub REST check runs](https://docs.github.com/en/rest/checks/runs).

## Priority 3 — impact and operational health

### Repository traffic — Measured, bounded by GitHub’s returned window

- Collect views, unique visitors, clones, and unique cloners only when the authenticated traffic endpoints return them.
- Persist dated daily slices and label the exact returned coverage window; never imply lifetime impact.
- Source: [GitHub REST repository traffic](https://docs.github.com/en/rest/metrics/traffic).

### Collection health — Observed now; deeper measurements pending

- Available now: exact repository inventory count, slices refreshed in the current canonical window, names of same-window stale slices retained after upstream failure, and an explicit **Unavailable** state when the refresh is not fully current.
- Current collection uses one account query, one search query, independently cached repository slices, concurrency six, and a 15-second timeout per GraphQL request.
- Correctness boundary: a stale slice is reusable only when its cached window exactly matches the requested UTC window. Without a matching slice, the full refresh fails and the dashboard retains its prior last-known-good snapshot.
- Still to collect: per-slice stale age, unavailable repository count from abandoned inventory entries, GraphQL cost, and a compact rate-limit disclosure.
- Source: [GitHub GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

## Product framing

DORA metrics are useful only when the underlying deployment model is actually measured. Weeknote may add deployment frequency, change lead time, change failure rate, failed-deployment recovery time, and deployment rework rate only after defining repository-specific deployment evidence. It must not relabel workflow runs or releases as production deployments by convenience.

Source: [DORA metrics guide](https://dora.dev/guides/dora-metrics/).

## Explicitly deferred

- LOC productivity rankings.
- Hours-worked estimates.
- Synthetic code-quality grades.
- Team comparisons for a single-user product.
- Account-wide Cloudflare free-tier verdicts without measured numerators and current documented limits.
