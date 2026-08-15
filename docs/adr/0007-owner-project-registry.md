# ADR 0007: Separate owner project registry

## Status

Accepted — 2026-08-15

## Context

Weeknote previously treated GitHub repositories and Cloudflare account resources as separate inventories. Similar names are not sufficient evidence that a repository owns a Worker, database, namespace, bucket, or domain. Account-wide Cloudflare measurements therefore could not be attributed safely to one project.

The existing Career D1 adapter was reviewed. It persists opportunities, commitments, and interview stories with a dedicated lifecycle and failure boundary. Adding operational infrastructure mappings to that database would couple unrelated storage concerns and allow project-registry failures to affect Career records.

Cloudflare Resource Tagging was also reviewed. It can tag many Cloudflare resource types, but it does not provide a canonical cross-provider record for GitHub repositories and owner notes, and it is currently a public-beta Cloudflare surface. It cannot replace an owner-scoped cross-provider registry.

## Decision

Weeknote uses a separate `weeknote-owner` D1 database bound as `OWNER_DB`.

The registry stores:

- owner projects with an owner-set lifecycle;
- exact GitHub repository identities;
- exact Cloudflare Worker, D1, KV, and R2 provider identities;
- owner-confirmed domains;
- canonical evidence links and explicit environments.

Every read and mutation requires both the Cloudflare Access assertion and the normalized configured owner email. Provider evidence joins only by exact persisted provider ID. Naming similarity is never sufficient to mark a resource Observed or Provisioned.

The Cloudflare collector retains parsed named Worker, D1, KV, and R2 inventory records in its independently versioned cache. A persisted mapping becomes current provider evidence only when its exact identifier appears in the authenticated inventory. Missing permissions, missing snapshots, and missing identifiers remain `Unavailable`.

Runtime demo snapshots are not returned when GitHub authentication is absent. Test fixtures remain test-only.

## Consequences

- Career, owner-project, GitHub-cache, and Cloudflare-cache failures remain isolated.
- Project mappings survive provider refresh failures as owner data, while their current evidence state can become `Unavailable`.
- A new project or resource association must be persisted explicitly before it appears in a dossier.
- Deleting a registry association does not delete the provider resource.
- Future deployment, runtime, Access, and storage evidence can attach to one project without relying on repository or resource names.
