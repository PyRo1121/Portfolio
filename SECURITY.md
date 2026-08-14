# Security Policy

Weeknote is a private, single-owner dashboard. Security fixes are handled on a best-effort basis while the project remains pre-release.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, private repository data, or dashboard snapshots. Use the repository's private GitHub Security Advisory form when available, or contact the owner through a private channel.

Include the affected commit, reproduction steps, impact, and sanitized logs. Never include a live GitHub token or Cloudflare credential.

## Credential handling

- Keep `GITHUB_TOKEN` in local `.env` files and the deployed Worker's secret store only.
- Never place credentials in `wrangler.jsonc`, source files, logs, screenshots, or test fixtures.
- Use the smallest read-only GitHub permissions that provide the required private-repository visibility.
- Rotate a token immediately if it may have been exposed.

## Scope

This policy covers the Weeknote source repository and its deployed Cloudflare Worker. GitHub and Cloudflare services remain subject to their own security policies.
