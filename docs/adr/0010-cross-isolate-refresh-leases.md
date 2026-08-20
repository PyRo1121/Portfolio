# ADR 0010: Cross-isolate refresh leases

- Status: Accepted
- Date: 2026-08-20

## Context

The GitHub, Cloudflare usage, and Cloudflare deployment caches publish complete last-known-good snapshots to Workers KV. Their in-memory promise maps collapse duplicate refreshes only inside one Worker isolate. Two isolates can therefore collect the same provider evidence concurrently and race to publish the same KV key.

Workers KV remains the read-optimized snapshot store. Moving provider collection or evidence payloads into a Durable Object would couple unrelated concerns and make the coordinator a throughput bottleneck.

## Decision

Run a service-only `weeknote-refresh-coordinator` Worker with a SQLite-backed Durable Object namespace.

- One Durable Object instance is addressed by each hashed cache publication key.
- The main Worker requests a token-bound five-minute lease before provider I/O.
- Active contention returns an explicit `Deferred` refresh result; it is not reported as success or provider failure.
- Browser clients retain last-known-good evidence and retry after a bounded five seconds.
- The warm Worker treats a deferred refresh as healthy because another isolate owns the publication.
- Lease release requires the holder token. Expired leases can be replaced after an isolate crash.
- Coordinator acquisition failures fail open: provider collection continues with process-local single-flight behavior, preserving availability while emitting an observable warning.
- Evidence, provider credentials, and snapshot payloads never enter Durable Object storage.

## Consequences

Cross-isolate refreshes no longer overwrite one another during normal operation. The coordinator adds two internal service requests and two Durable Object RPC sessions to a successful stale refresh. Current traffic is far below the Workers Free allowance for SQLite-backed Durable Objects.

A lease is coordination, not proof of publication. Existing complete-snapshot validation and last-known-good KV rules remain authoritative. The five-minute expiry bounds abandoned locks but can permit duplicate work if a provider refresh exceeds that duration; provider request deadlines keep normal collections below that bound.
