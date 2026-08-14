# ADR 0005: Bounded GitHub check-run annotations

## Status

Accepted, with a production permission limitation.

## Context

Workflow run conclusions showed whether verification passed or failed but not why. The first `main` push to `PyRo1121/portfolio` created two GitHub Actions jobs that failed before runner allocation, leaving no steps and no log archive. Each corresponding check run did expose one failure annotation with GitHub's exact pre-run message.

The Actions endpoint's `actor` filter also returned Dependabot `dynamic` runs. Counting those runs contradicted the dashboard label "user-triggered checks" and allowed automated update failures to displace product verification evidence.

## Decision

Verification totals include only default-branch runs whose event is `push`, `workflow_dispatch`, or `repository_dispatch`. Dependabot `dynamic`, scheduled, chained, and other machine-triggered events are excluded from this user-triggered formula.

For the newest four failed runs, Weeknote:

1. fetches at most two 100-job pages from the exact Actions run;
2. treats failed job IDs as check-run IDs;
3. fetches at most two 100-annotation pages per failed job;
4. retains at most eight annotations, ordered failure before warning before notice;
5. stores exact repository, run, job URL, annotation level, path, line range, title, and message;
6. caps each message at 800 characters and records whether truncation occurred.

Jobs and annotations are parsed independently from workflow totals. A request or parsing failure marks annotation coverage **Unavailable** without discarding Actions totals. HTTP `403` is reported as permission-limited and identifies the required fine-grained **Checks: read** permission.

A dashboard snapshot stores annotation coverage in the versioned private envelope. Legacy snapshots remain readable through explicit **Unavailable** defaults.

The UI shows the newest exact annotation as **Observed** and links directly to its GitHub job. It does not infer a current billing balance, quota, or root cause beyond GitHub's returned message. Workflow runs remain verification artifacts and are never promoted to delivery outcomes.

## Permission boundary

The current dedicated runtime PAT can list workflow jobs (`200`) but annotation requests return `403 Resource not accessible by personal access token`. Production remains **Unavailable** until a dedicated server token receives **Checks: read**. Wrangler's broad GitHub CLI OAuth credential must not be embedded in the Worker.

A local one-off validation using the authorized GitHub CLI token observed the exact portfolio CI annotation and proved the collector/UI path; that credential was not persisted in project configuration or Cloudflare.

## Sources

- [List check runs for a Git reference](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference)
- [List check-run annotations](https://docs.github.com/en/rest/checks/runs#list-check-run-annotations)
- [List jobs for a workflow run](https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run)
