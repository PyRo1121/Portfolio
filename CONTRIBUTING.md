# Contributing to the Portfolio (GH-Stats)

Thanks for your interest in contributing to the portfolio site.

## Code of conduct

Be respectful and constructive. Harassment and discrimination are not tolerated.

## How to contribute

1. **Open an issue** first for bugs, feature requests, or design discussions.
2. **Branch from `main`** using a short, descriptive name
   (`feat/<area>-<summary>` or `fix/<area>-<summary>`).
3. **Keep changes small and focused.** One logical change per pull request.
4. **Add tests** for behavior you change (Vitest).
5. **Run the checks** before opening a PR:
   - `npm run lint` (oxlint)
   - `npm run typecheck` (tsc)
   - `npm test` (Vitest)
6. **Open a pull request** against `main`. It must pass CI before merge.

## Project layout

- `src/` — application source
- `static/` — static assets (fonts, robots, site auth)
- `docs/` — decisions and documentation (including ADRs)

## Security

This repository is `UNLICENSED` (proprietary). Report security issues privately
per `SECURITY.md`. Do not include secrets, tokens, or credentials in code,
commits, or logs.

## Questions

Open a discussion or issue. Maintainers respond asynchronously.