# Portfolio SEO review

Reviewed September 30, 2026. Target: https://latham.cloud/. The goal is qualified visits to Olen Latham's work and contact paths, particularly from recruiters. These changes improve relevance and technical consistency. They do not guarantee rankings or a job.

## What the live audit found

| Area               | Evidence before changes                                                                                                                     | Decision                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Crawlability       | All four public pages returned readable HTML with titles, descriptions, canonical links, and JSON-LD without JavaScript.                    | Keep prerendering. No client-only content or new SEO dependency.                                                                             |
| Basic SEO          | Live homepage mobile Lighthouse SEO, accessibility, and best practices each scored 100.                                                     | A perfect checklist score is not a ranking result. Concentrate on content and identity rather than redundant tags.                           |
| Homepage relevance | H1 was "I build tools that make setup and delivery easier to inspect." The opening copy omitted the developer's name, location, and stack.  | Name Olen and the software developer role in the H1. Put Rust, TypeScript, SvelteKit, Cloudflare Workers, and real location in visible copy. |
| Project relevance  | Neither case study's H1 named its product.                                                                                                  | Name OMG and DeployLint with their technical purpose. Add source-linked engineering decisions, not generic SEO articles.                     |
| Author identity    | Person markup used a social card as the profile image. About used AboutPage alone. Case studies had no visible author link.                 | Use the real portrait, a ProfilePage on About, consistent Person IDs, a visible linked byline, and breadcrumbs.                              |
| Public page weight | Shared CSS included the owner dashboard, its layout rules, and Observatory Mono.                                                            | Import dashboard CSS only on /owner. Preserve public colors and layout.                                                                      |
| Revision signals   | Sitemap omitted lastmod.                                                                                                                    | Add explicit content revision dates shared with page markup. Never substitute the current build time.                                        |
| Host normalization | HTTP redirected to HTTPS with 301. www.latham.cloud failed DNS resolution. /about/ redirected with 307.                                     | Preserve HTTPS. Add explicit permanent slash redirects for public pages. WWW requires a separate DNS and edge rule.                          |
| Private routes     | /owner redirected to Cloudflare Access. /career/portfolio.md returned 404 with noindex, nofollow. Missing public routes returned real 404s. | Keep authentication, noindex, and private cache controls. No private records enter the sitemap or page graphs.                               |
| Project evidence   | OMG architecture and DeployLint's GitHub Actions guide were publicly readable.                                                              | Link specific technical explanations to those sources. Keep DeployLint's implementation private.                                             |

A Chrome trace of the live homepage reported LCP 1,074 ms and CLS 0.00 under 4x CPU and Slow 4G emulation. This was a warm-browser lab observation, not a cold-load benchmark or real-user percentile. The trace reported no CrUX data for the page. INP and search traffic cannot be inferred from this run.

## Changes in this repository

- Unique, concise search titles and descriptions. The homepage targets Olen's identity and role. Case study pages target the projects and their technical subjects.
- Visible job interests and stack without invented employment, certifications, years of experience, adoption numbers, or performance claims.
- Source-linked details about OMG's native package backends, optional daemon, and security limits. DeployLint covers repository evidence, lockfiles, GitHub Apps, pull request review, and production credential separation.
- One `PublicSeoHead.svelte` component for public metadata. Owner and error pages retain their own noindex metadata.
- Consistent WebSite, Person, ProfilePage, Article, and breadcrumb markup. OMG's public code uses SoftwareSourceCode. DeployLint uses CreativeWork. No SoftwareApplication rich-result claim, fake offer, rating, or review.
- Real portrait in Person markup. The 1200 by 630 PNG social cards remain separate.
- HTML-safe JSON-LD serialization. Case study headings, schema headlines, bylines, and explicit revision dates agree.
- Four canonical sitemap entries with manually maintained lastmod values. No invented publication dates, priority values, or change frequencies.
- Public-only shared styles. On the same dependency installation, the shared client CSS bundle fell from 49.60 kB to 6.99 kB, about 86% less uncompressed CSS. Gzip size fell from 11.74 kB to 3.39 kB. These are shared CSS figures, not total page size or a traffic prediction.
- Portrait fetch priority and accurate intrinsic dimensions. Below-the-fold project screenshots stay lazy-loaded.
- Markdown links in llms.txt for public portfolio and project destinations. This is a reader convenience, not a documented Google ranking factor.
- `npm run seo:check` checks actual prerendered HTML, metadata uniqueness, canonical URLs, sitemap entries, JSON-LD, visible article headings/dates, assets, public internal links, and exclusion of owner CSS. CI runs it after the build.

## Verification

- `npm run check`: no errors or warnings.
- `npm run lint`: passed.
- `npm test`: 46 test files, 176 tests passed.
- `npm run seo:check`: all four generated public pages passed.
- Full `npm run ci`: passed in a temporary copy with the same installed dependencies. The original checkout's Cloudflare adapter output directory was already locked on Windows before changes, causing EBUSY on rmdir. No existing process was terminated and no application configuration changed to bypass it.
- Browser checks at 390 px found no horizontal overflow, broken loaded images, dashboard CSS, or Observatory Mono requests on the four public pages.
- Local mobile Lighthouse on DeployLint: SEO 100, accessibility 100. Best practices was 96 because repeated local audit requests triggered the existing telemetry rate limit. This is not a production regression measurement.

The initial audit finished before deployment. Search Console data and actual index coverage were not available. The HTML checker is a regression gate, not a substitute for Google's Rich Results Test or URL Inspection.

### Authorized Cloudflare follow-up

On September 30, 2026, the owner authorized applying the Cloudflare fixes and deploying the changes. Added a proxied CNAME from `www.latham.cloud` to `latham.cloud` and a 301 redirect that preserves the request path and query string. The redirect matches only `www.latham.cloud`; the six pre-existing rules, including the OMG migration redirects, remain unchanged. The rule passed Cloudflare's dry-run validation before creation.

- Zone: `eca2db53dffce43d6350a177265bb512`.
- Added DNS record: `5dcd68c95195e5f1382ab92df2fe0b41`.
- Added redirect rule: `7d803134ce5b47c6a54eaf1f96ae3f6d` in ruleset `331e0b0b23c54496a1ca206e88a7ddb3`.
- Deployment follows the existing clean-tree CI, migration, and exact-Git-SHA release workflow, using a fresh worktree to avoid the original Windows output-directory lock.

To roll back only the WWW change, remove the added DNS record and redirect rule above. Do not replace the existing ruleset or alter the apex, email, or OMG records.

## Release checklist

1. Review and commit the changes. If the original checkout still hits EBUSY, close the process holding `.svelte-kit/cloudflare` or use a clean checkout. Do not skip the release gate.
2. Run `npm run ci`, then the existing `npm run deploy` workflow. It requires a clean tree and performs migration and deployment checks.
3. Check all four production URLs, social images, sitemap, and slash variants. Confirm the new `_redirects` rules return a permanent redirect while retaining query strings. Vite preview does not emulate Cloudflare asset redirect rules.
4. Add the `www.latham.cloud` DNS record and a Cloudflare redirect to `https://latham.cloud`, preserving path and query. Validate TLS before directing traffic there. This audit did not change DNS or edge configuration.
5. Verify the domain property in [Google Search Console](https://search.google.com/search-console/) and the site in [Bing Webmaster Tools](https://www.bing.com/webmasters/). The repository's Bing verification file does not prove that the account is verified or pages are indexed.
6. Submit `https://latham.cloud/sitemap.xml` in both tools. Inspect each canonical URL in Search Console, test the deployed structured data, and request indexing for the updated pages.
7. Run `npm run seo:indexnow` after deployment. It submits the live sitemap URLs, so running it before deployment would notify engines about the old content. IndexNow serves participating engines including Bing. Google is not listed among the participating endpoints. It is not a Google indexing API or a ranking guarantee.

## How to earn more qualified traffic

| Search intent                                           | Best landing page                         | Evidence to strengthen                                                                                       |
| ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Olen Latham, Olen Latham developer                      | Homepage and About                        | Consistent name and canonical portfolio link on GitHub and LinkedIn.                                         |
| Software developer in McKinney, Texas                   | Homepage and About                        | Real location, clear role interests, public resume, and relevant project work. No fabricated location pages. |
| OMG Rust CLI, package and runtime management            | OMG case study                            | Public source, release limits, backend design, and documentation.                                            |
| DeployLint GitHub Actions setup                         | DeployLint case study                     | Live product, repository planning, workflow review, and deployment boundaries.                               |
| Native package backends in Rust, repository-aware CI/CD | Case studies and future technical writing | First-hand implementation details, reproducible examples, and explicit tradeoffs.                            |

Broad terms such as "software developer" are competitive and often have a different intent. The first targets should be Olen's name, product names, and specific technical subjects, not a promise to outrank job boards or established documentation sites.

### Next month

- Link the relevant case study from each pinned GitHub project README and add the canonical portfolio to the GitHub profile and LinkedIn contact information. Request author links on project sites where accurate. Do not buy backlinks.
- Publish one first-hand technical write-up per project only when there is new evidence to share. Good candidates are native package transaction boundaries in OMG and handling ambiguous monorepo evidence in DeployLint. Include source references or reproducible examples. Do not mass-produce keyword pages.
- Review Search Console weekly by query and landing page. Record clicks, impressions, CTR, and indexing status. Separate branded searches from technical discovery and compare rolling 28-day periods after indexing.
- Pair those search metrics with existing resume and contact-link actions. A click is not proof of a completed download, email, interview, or hire. Track actual recruiter conversations separately.
- If a page receives impressions but few clicks, review its title and opening copy against the queries. If it receives no impressions, check index coverage and relevant inbound links before rewriting metadata again.

## Primary sources

Research considered 15 search-result candidates through an Exa research helper. Recommendations above use official documentation and inspected project evidence. Search results alone do not establish rankings or traffic.

- [Google title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google snippets](https://developers.google.com/search/docs/appearance/snippet)
- [Google ProfilePage markup](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Google Article markup](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [IndexNow FAQ and participating endpoints](https://www.indexnow.org/faq)
- [Cloudflare Workers asset redirects](https://developers.cloudflare.com/workers/static-assets/redirects/). This repository's SvelteKit adapter copies the root `_redirects` file to the deployed asset directory.
- [OMG architecture](https://github.com/omg-cli/omg/blob/main/docs/architecture.md)
- [DeployLint CI/CD guide](https://deploylint.com/guides/github-actions-setup)
