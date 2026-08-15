# ADR 0008: Exact project deployment evidence

## Status

Accepted — 2026-08-15

## Context

A Worker inventory record proves that a named resource exists, but it does not prove which Git change is serving production traffic. Similar names, timestamps, a successful workflow in another repository, and a recently modified Worker are insufficient linkage.

Cloudflare exposes separate deployment, immutable version, and Workers Builds records. GitHub exposes exact commit SHAs, workflow head SHAs, and pull-request merge commit SHAs. These records have different permissions and can fail independently.

## Decision

Deployment evidence is collected only for Workers explicitly linked through the owner project registry. It uses a separate versioned KV cache scoped to the exact Cloudflare account and sorted Worker-name set, preserving the account-usage cache when deployment collection fails.

For each linked Worker, Weeknote retains the current deployment, up to four traffic-bearing immutable versions, version annotations, and the result of querying Workers Builds by version ID. No logs or secret binding values are retained.

A deployment commit is accepted only from an exact `git:<40-character SHA>` deployment or immutable-version annotation. Conflicting deployment and version annotations make the commit link unavailable.

The project dossier joins records only through exact identifiers:

1. pull request `mergeCommit.oid`;
2. default-branch commit SHA;
3. successful retained workflow `head_sha` in the same repository;
4. Workers Build `commit_hash` associated with the immutable version ID;
5. immutable Worker version ID; and
6. active deployment version ID.

The chain is **Linked** only when every record exists and names the same commit. It is **Partially linked** when the deployment names an exact commit but one or more canonical records are absent. It is **Unavailable** when no readable deployment/version pair or exact commit annotation exists.

A successful empty Workers Builds response is **No record**. An authentication or response-shape failure is **Unavailable**. Cloudflare documents that the Builds API requires a user-scoped Builds token; Weeknote does not reinterpret that permission boundary as evidence that no build occurred.

## Consequences

- Manual Wrangler deployments can truthfully link commit, workflow, version, and deployment while showing no Cloudflare Build record.
- Local merges remain commit evidence and are not relabeled as pull requests.
- Old GitHub cache records remain readable, with unavailable SHA linkage until a fresh collection records workflow head SHAs and PR merge SHAs.
- Deployment failures cannot invalidate GitHub, Career, project-registry, or account-usage evidence.
- Deployments should continue carrying an exact Git SHA in both Wrangler `--message` and `--tag` metadata.
