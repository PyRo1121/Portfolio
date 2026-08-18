# TypeScript engineering standard

This standard applies to new or modified JavaScript and TypeScript code. It does not mandate Effect or any other programming framework.

## 1. Language and project fit

- Follow the project's established language and module format. Prefer TypeScript for new runtime/application modules in an existing TypeScript project.
- JavaScript remains appropriate for host-constrained configuration, fixtures, scripts, or an intentionally JavaScript-only package. Use JSDoc types when they materially improve checking.
- Do not convert unrelated files merely to satisfy this preference. A language exception is case-by-case and needs one brief rationale in the completion report or code review.

## 2. Compiler baseline

Every maintained TypeScript project must run `tsc --noEmit` in CI and enable `strict`. New projects should also enable the applicable safety options below; existing projects should enable them when the touched code can adopt them without unrelated churn:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noPropertyAccessFromIndexSignature`
- `useUnknownInCatchVariables`

Do not weaken compiler options to make a change pass. If an established project cannot yet enable one project-wide option, keep the strictest existing configuration, avoid adding new violations, and record the specific exception.

References: [TypeScript `strict`](https://www.typescriptlang.org/tsconfig/strict.html), [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html), and [`exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html).

## 3. Types and boundaries

- Do not add explicit `any`. Start untrusted values as `unknown` and narrow them with runtime checks. A dependency declaration that exposes `any` does not justify spreading it through application code.
- Avoid type assertions and non-null assertions. Use them only after a locally stated invariant that the compiler cannot express; prefer a parser, guard, discriminated union, or API redesign.
- Model states and failures with discriminated unions when callers must handle distinct outcomes. Make exhaustive switches fail at compile time.
- Keep domain types close to their owning module. Do not create speculative generic abstractions or duplicate dependency types.
- Validate every untrusted boundary: JSON, environment variables, filesystem state, network responses, persisted records, tool input, and provider output. Prefer a mature validation library already present in the project.
- Version durable formats explicitly. Preserve read compatibility for user data through bounded versioned readers or transactional migrations. Reject unknown forward versions. Never silently reinterpret, discard, or rewrite integrity-bound data.
- Additive fields may be ignored only when they cannot alter authority or semantics. Security-sensitive authority fields require explicit validation.

## 4. Errors, cancellation, and resources

- Never swallow an error unless the operation is explicitly optional and the fallback is observable or documented. Catch `unknown`, classify it, and preserve useful causal context without leaking secrets.
- Do not use thrown strings or ambiguous sentinel values. Return or throw typed, actionable failures at module boundaries.
- Thread `AbortSignal` through cancellable asynchronous work. Recheck cancellation after awaited side effects when stale continuation would be unsafe.
- Make ownership of files, locks, timers, subprocesses, sockets, and database handles explicit. Release resources with `finally`, scoped helpers, or the runtime's disposal mechanism.
- Await owned promises. Floating work must have a documented lifecycle owner and surfaced failure path.

Reference: [Node.js `AbortController` and `AbortSignal`](https://nodejs.org/api/globals.html#class-abortcontroller).

## 5. Structure and implementation

- Implement the smallest end-to-end vertical slice. Keep parsing/validation, domain decisions, persistence, and UI/transport concerns separated.
- Prefer pure functions for classification and transitions; keep side effects behind narrow adapters.
- Use existing project dependencies and inspect their installed documentation, declarations, and tests before reimplementing behavior or adding a package.
- Remove obsolete runtime paths rather than adding compatibility shims. Durable persisted data is the exception described above.
- Comments explain invariants, ownership, or non-obvious safety decisions—not syntax.

## 6. Lint, formatting, tests, and CI

Each maintained project must have CI commands for:

1. compiler checking;
2. ESLint with `@typescript-eslint` and type-aware rules for TypeScript where the project toolchain supports them;
3. deterministic formatting checks;
4. focused unit/integration tests for changed behavior.

The lint baseline must reject explicit `any`, floating promises, misused promises, unsafe assignment/member access/calls/returns, unnecessary assertions, unhandled exhaustive branches, and unused suppression directives. Exceptions require the narrowest inline disable plus a reason; never disable a rule project-wide just to land one change.

References: [typescript-eslint typed linting](https://typescript-eslint.io/getting-started/typed-linting/) and [shared configurations](https://typescript-eslint.io/users/configs/).

## 7. LLM-assisted workflow

For generated or LLM-modified code:

1. Read the exact local API declarations and nearby tests before editing.
2. Make one bounded change at a time.
3. Run the narrowest relevant compiler/lint/test feedback loop.
4. Fix the underlying type or contract instead of adding assertions, `any`, fallbacks, or compatibility layers.
5. Inspect the final diff for unrelated changes, duplicated paths, weakened validation, unowned async work, and schema compatibility.
6. Before completion, report changed files, checks run, remaining risks, and the next useful action.

Compiler and linter feedback are engineering gates, not cleanup after generation.
