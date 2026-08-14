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

### Failed-step evidence — New collection required

- Collect failing job steps and timestamps only after a job actually starts. Jobs rejected before runner allocation have no steps and must not be assigned an inferred root cause.
- Link directly to the run; never infer root cause from a step name.
- Source: [GitHub REST workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs).

### Check annotations — Observed through a least-privilege GitHub App

- Formula: from the newest four failed default-branch `push`, `workflow_dispatch`, or `repository_dispatch` runs, inspect at most two pages of jobs and two pages of check-run annotations. Retain at most eight annotations; cap messages at 800 characters and mark truncation.
- Dependabot `dynamic`, scheduled, and chained automation runs do not affect the user-triggered verification pass rate.
- Each annotation retains exact repository, run, job URL, level, path, line range, and bounded GitHub message. The dashboard links to the job and does not infer a billing balance or root cause beyond GitHub's returned text.
- GitHub's fine-grained PAT UI does not expose the documented **Checks: read** permission. Weeknote keeps Actions job discovery on its fine-grained PAT and uses a private GitHub App with only **Checks: read** plus mandatory **Metadata: read** for annotations. The Worker mints one short-lived installation token per refresh; no broad classic PAT or GitHub CLI OAuth token is embedded.
- Source: [GitHub REST check runs](https://docs.github.com/en/rest/checks/runs).

## Priority 3 — impact and operational health

### Repository traffic — Measured, bounded by GitHub’s returned window

- Collect views, unique visitors, clones, and unique cloners only when the authenticated traffic endpoints return them.
- Persist dated daily slices and label the exact returned coverage window; never imply lifetime impact.
- Source: [GitHub REST repository traffic](https://docs.github.com/en/rest/metrics/traffic).

### Collection health — Observed and Measured

- Available now: exact repository inventory count, slices refreshed in the current canonical window, names of same-window stale slices retained after upstream failure, oldest retained-slice age, successful GraphQL request count, and GitHub-returned point cost.
- Current collection uses one account query, one search query, independently cached repository slices, concurrency six, and a 15-second timeout per GraphQL request.
- Cost formula: sum `rateLimit.cost` across successful account, search, repository, and commit-pagination responses. The total is **Measured** only when every repository refreshed. After fallback, known successful-response points remain disclosed, but total cost is **Unavailable** because a failed request returned no cost.
- Correctness boundary: a stale slice is reusable only when its cached window exactly matches the requested UTC window. Without a matching slice, the full refresh fails and the dashboard retains its prior last-known-good snapshot.
- Still to collect: unavailable repository count from abandoned inventory entries and a compact current rate-limit/reset disclosure. The existing account-query observation is not presented as a post-collection balance.
- Source: [GitHub GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api).

## Product framing

DORA metrics are useful only when the underlying deployment model is actually measured. Weeknote may add deployment frequency, change lead time, change failure rate, failed-deployment recovery time, and deployment rework rate only after defining repository-specific deployment evidence. It must not relabel workflow runs or releases as production deployments by convenience.

Source: [DORA metrics guide](https://dora.dev/guides/dora-metrics/).

## Explicitly deferred

- LOC productivity rankings.
- Hours-worked estimates.
- Synthetic code-quality grades.
- Team comparisons for a single-user product.
- Account-wide Cloudflare free-tier verdicts without measured numerators and current documented limits.
