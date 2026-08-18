# Accountability Review evidence contract

The Career workspace on `/owner` opens on a decision-first Accountability Review. It connects engineering evidence to two deliberate commitments without converting activity into a productivity or hiring score.

## Strongest retained outcome

Only the bounded GitHub delivery artifacts retained in the dashboard snapshot qualify:

1. stable release;
2. merged pull request;
3. closed issue;
4. prerelease.

The newest retained occurrence breaks ties. Commits, changed files, and workflow runs do not become outcomes by themselves. The selected artifact links directly to GitHub.

Repository verification is a separate claim. It is **Observed** only when a retained successful GitHub Actions run matches the selected artifact's repository. A successful workflow elsewhere is not attached to the outcome.

## Two-track commitments

The review selects one open Build commitment and one open Career commitment from the owner-scoped Career D1 database. The earliest due date wins; the most recently updated record breaks ties. A missing commitment is **Unavailable**, not complete.

Due labels and follow-up warnings use the browser-resolved viewer-local date. Overdue and due-today opportunity actions appear as warnings. Future actions remain visible as the next scheduled follow-up.

## Full-stack evidence chain

The coverage map remains lane-based and is never summed into a score:

- **Outcome ownership — Observed:** a merged PR, closed issue, or release exists.
- **TypeScript implementation — Observed:** GitHub language evidence includes TypeScript. Repository-level linkage is stated only when the selected repository reports TypeScript as its primary language.
- **Automated verification — Observed:** a successful retained workflow matches the selected repository.
- **Runtime operation — Measured:** Cloudflare reports a Worker request metric. This is account-level evidence unless deployment linkage is collected.
- **Data platform — Provisioned:** Cloudflare inventories D1 databases. Provisioning does not prove ownership of the selected artifact.
- **Outcome communication — Observed:** an interview story is recorded. Story visibility controls inclusion in the public Markdown export, while the Accountability Review itself is owner-only on `/owner`. A story links externally only when its GitHub outcome was server-verified and stored as an Observed association. Legacy free-form links remain Unavailable.

## Role relevance

Role relevance is explicitly **Inferred** from the available lanes. The review does not claim that account-level Cloudflare evidence belongs to the selected GitHub outcome.

Changed-file paths and outcome-to-deployment linkage are not currently collected. Therefore, frontend, backend, and data ownership are not attributed to the selected artifact. No coverage count, hiring probability, productivity score, or peer comparison is produced.
