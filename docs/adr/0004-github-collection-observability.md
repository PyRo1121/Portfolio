# ADR 0004: GitHub collection observability

## Status

Accepted.

## Context

Incremental repository refresh isolated upstream failures, but fresh/stale counts alone did not answer two operational questions: how old retained evidence was, and what the complete GraphQL collection cost. The account query's early `remaining` observation could not be treated as a post-collection balance because repository and pagination requests run concurrently afterward.

## Decision

Every successful GraphQL operation requests GitHub's `rateLimit { cost limit remaining resetAt }` object. Repository refresh results carry current-request observations separately from the evidence slice written to KV. Typed repository failures preserve costs from successful first pages or pagination pages before a later failure. Cached evidence therefore never contributes a prior run's cost to the current collection.

Collection cost is:

`sum(rateLimit.cost for every successful account, search, repository, and commit-pagination response)`

Successful request count is the number of those returned observations. The total is **Measured** only when every repository slice refreshed. If any repository falls back to same-window cache, known successful-response points are still disclosed, but the total is **Unavailable** because GitHub returned no cost for the failed request.

Each stale result carries the cache envelope's `cachedAt`. The dashboard persists the oldest retained timestamp and renders its age relative to snapshot generation time. Legacy snapshots without cost or stale-age fields remain readable through explicit **Unavailable** defaults.

The existing account-query `remaining`, `limit`, and `resetAt` fields remain retained for compatibility but are not presented as a post-collection balance.

## Consequences

- Collection cost includes commit pagination instead of silently counting only first pages.
- Failed requests cannot produce fabricated zero-cost observations, while successful pages before a later failure remain in the known lower bound.
- Current-request telemetry remains separate from durable repository evidence.
- Live verification across 25 repositories measured 29 points across 29 successful responses, including two pagination requests.
- A live injected repository `502` retained one exact-window slice and reported 27 known points across 27 successful responses with total cost **Unavailable**.

## Source

- [GitHub GraphQL rate limits and node limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api)
