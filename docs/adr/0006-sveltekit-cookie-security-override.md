# ADR 0006: Narrow SvelteKit cookie security override

## Status

Accepted.

## Context

GitHub Dependabot reported development-scoped low-severity advisory `GHSA-pxg6-pf52-xh8x` / `CVE-2024-47764` through `@sveltejs/kit@2.70.2 -> cookie@0.6.0`. Versions before `0.7.0` accepted out-of-bounds characters in cookie names, paths, and domains. The patched validation rejects values outside RFC 6265.

SvelteKit 2.70.2 still declares `cookie ^0.6.0`. SvelteKit maintainers documented that moving the framework's declared range to 0.7 would be breaking for applications relying on previously accepted invalid cookie names, but explicitly recommended a package-manager override for applications that do not need that behavior.

Weeknote declares no custom cookie names and has no application path that passes untrusted cookie name, path, or domain values to SvelteKit. The runtime API used by SvelteKit remains `parse` and `serialize`; the relevant 0.7 change is stricter serialization validation.

## Decision

Use an exact nested npm override:

```json
{
	"overrides": {
		"@sveltejs/kit": {
			"cookie": "0.7.2"
		}
	}
}
```

The override is intentionally scoped to SvelteKit. A global `cookie` override was rejected because Wrangler's `youch` dependency correctly resolves patched `cookie@1.1.1`; constraining every dependency to 0.7.2 made that separate tree invalid.

The exact package review found no known vulnerability, install-script, malware, repository, or license issue. npm provenance and registry-signature verification were unavailable, so this is not represented as verified supply-chain provenance. The npm lockfile retains the registry-declared SRI integrity.

## Verification

- Clean `npm ci --ignore-scripts` resolves SvelteKit to `cookie@0.7.2` and Wrangler/Youch to `cookie@1.1.1`.
- Full `npm audit --audit-level=low` reports zero vulnerabilities.
- Svelte/TypeScript checks, lint, 60 tests, production build, and strict Wrangler dry-run pass.

## Sources

- [GitHub advisory GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x)
- [SvelteKit issue 12903](https://github.com/sveltejs/kit/issues/12903)
- [SvelteKit pull request 12768](https://github.com/sveltejs/kit/pull/12768)
- [jshttp/cookie validation fix](https://github.com/jshttp/cookie/pull/167)
