# Svelte 5 & Effect TS Coding Standards

These standards describe how to design and write Svelte 5 + Effect TypeScript code. They are especially intended for agents: before adding patterns, libraries, adapters, or abstractions, read the existing code and prefer the local convention unless it conflicts with the safety/correctness principles below.

## Decision Priority

When patterns or architectural paradigms conflict, apply this strict order:

1. **Type-Safety, Correctness, and Total Error Explicit-ness** — Never compromise type constraints or explicit error tracks for brevity. All failures must be visible via the type system.
2. **Runes-First Svelte 5 Mechanics** — Leverage native Svelte 5 compiler constructs (`$state`, `$derived`, `$effect`, `$props`) exclusively for reactive bindings.
3. **Pure Domain Encapsulation** — Keep UI components radically thin. Push side effects, asynchronous state channels, and business rules completely into functional domain layers powered by Effect TS.
4. Follow established project architecture and conventions.
5. Improve the local design toward these standards.
6. Avoid broad migrations unless explicitly requested.
7. Document meaningful trade-offs with comments or ADRs.

New code paths, modules, adapters, and services should generally follow these standards, but do not force a whole-project migration for an unrelated change.

## Core Principles

- Prefer **errors as values** (Effect error channels) over `throw` / rejected promises for expected failures.
- Parse early with `@effect/schema`. Do not merely validate and throw away the information learned.
- Make illegal states unrepresentable where practical (branded types, tagged unions).
- Prefer correct-by-construction APIs over convention-based invariants.
- Use branded/refined/domain types liberally for meaningful primitives.
- Prefer composition over inheritance.
- Prefer **imperative shell / functional core**: thin Svelte components + pure Effect domain.
- Design deep, cohesive modules with low caller burden.
- Keep code discoverable for humans and agents.
- Never leave an endpoint payload, form value, or storage value unparsed.

---

## 1. Domain-Driven Type Systems (Strict TypeScript)

### Nominal & Branded Types

Avoid raw primitive types (`string`, `number`) for database identifiers, currencies, or domain-critical keys. Enforce structural uniqueness using Effect's branding or nominal schemas to eliminate accidental assignment bugs.

```ts
import { Schema } from '@effect/schema';

// Define strict branded schemas
export const UserId = Schema.String.pipe(Schema.brand('UserId'));
export type UserId = Schema.Type<typeof UserId>;

export const ProductId = Schema.String.pipe(Schema.brand('ProductId'));
export type ProductId = Schema.Type<typeof ProductId>;

export const EmailAddress = Schema.String.pipe(
	Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/),
	Schema.brand('EmailAddress')
);
export type EmailAddress = Schema.Type<typeof EmailAddress>;
```

### Complete Svelte-Friendly Schemas

Parse external inputs (API payloads, local storage, form submissions) explicitly using `@effect/schema`. Trap decoding anomalies inside the type engine before they ever leak into Svelte component runtimes.

```ts
export const UserProfileSchema = Schema.Struct({
	id: UserId,
	username: Schema.NonEmptyString,
	email: EmailAddress,
	createdAt: Schema.DateFromString
});

export type UserProfile = Schema.Type<typeof UserProfileSchema>;
```

Prefer `Schema.decodeUnknown` / `Schema.decodeUnknownEither` at every boundary. Never pass `unknown` or loosely typed JSON deeper into the application.

---

## 2. Structural Functional Domain Architecture

### Pure Function Operations

House domain mechanics in pure functions or domain services rather than distributed inline across UI layout events. Express computational tracks through piping (`pipe`) or generator patterns (`Effect.gen`), yielding explicit success and error vectors.

```ts
import { Effect, Schema } from 'effect';
import { UserId, UserProfile, UserProfileSchema } from './types';

export class UserNotFoundError extends Error {
	readonly _tag = 'UserNotFoundError';
	constructor(readonly id: UserId) {
		super(`User ${id} not found`);
	}
}

export class NetworkFetchError extends Error {
	readonly _tag = 'NetworkFetchError';
	constructor(
		readonly reason: string,
		readonly cause?: unknown
	) {
		super(reason);
	}
}

export const fetchUserProfile = (
	id: UserId
): Effect.Effect<UserProfile, UserNotFoundError | NetworkFetchError, never> =>
	Effect.gen(function* () {
		const response = yield* Effect.tryPromise({
			try: () => fetch(`/api/users/${id}`),
			catch: (cause) => new NetworkFetchError('Network boundary failed', cause)
		});

		if (response.status === 404) {
			yield* Effect.fail(new UserNotFoundError(id));
		}

		if (!response.ok) {
			yield* Effect.fail(new NetworkFetchError(`Unexpected status ${response.status}`));
		}

		const rawData = yield* Effect.tryPromise({
			try: () => response.json(),
			catch: (cause) => new NetworkFetchError('Invalid JSON structure received', cause)
		});

		return yield* Schema.decodeUnknown(UserProfileSchema)(rawData).pipe(
			Effect.mapError((parseError) => new NetworkFetchError('Schema decode failed', parseError))
		);
	});
```

### Errors as Values

- Expected failures (domain, parsing, network, authorization) live in the Effect error channel.
- Unrecoverable defects (impossible states, violated invariants) may throw via shared helpers (`casesHandled`, `shouldNeverHappen`).
- Prefer precise tagged error unions at module boundaries. Avoid broad `AppError` types except near entry points and UI rendering.

---

## 3. Svelte 5 Reactivity Meets Effect TS

### Reactive Context Bridges

Never wrap unparsed `Promise` states directly in UI layers. Run Effect sequences to ground level inside `.svelte.ts` modules (or equivalent pure TS modules). Map the resulting pattern match onto native Svelte 5 `$state` fields to seamlessly power the view layer.

```ts
// src/lib/state/user-view.svelte.ts
import { Effect, Exit } from 'effect';
import {
	fetchUserProfile,
	type UserProfile,
	type UserNotFoundError,
	type NetworkFetchError
} from '$lib/domain/user';
import { UserId } from '$lib/domain/types';
import { Schema } from '@effect/schema';

export class UserViewState {
	// Svelte 5 Native Reactive Properties
	#data = $state<UserProfile | null>(null);
	#error = $state<UserNotFoundError | NetworkFetchError | null>(null);
	#isLoading = $state(false);

	// Read-only getters for the UI
	get data() {
		return this.#data;
	}
	get error() {
		return this.#error;
	}
	get isLoading() {
		return this.#isLoading;
	}

	load(rawId: string) {
		this.#isLoading = true;
		this.#error = null;
		this.#data = null;

		const pipeline = Schema.decodeUnknown(UserId)(rawId).pipe(Effect.flatMap(fetchUserProfile));

		// Run the Effect into Svelte reactive boundaries
		Effect.runPromiseExit(pipeline).then((exit) => {
			this.#isLoading = false;
			Exit.match(exit, {
				onFailure: (cause) => {
					// Unify failure track to reactive state
					// Prefer extracting the first typed error when possible
					this.#error = (cause as any).errors?.[0] ?? cause;
					this.#data = null;
				},
				onSuccess: (profile) => {
					this.#data = profile;
					this.#error = null;
				}
			});
		});
	}
}
```

### Preferred Patterns

- Prefer classes with private `$state` fields + public getters for view models that need multiple related pieces of state.
- Prefer `$derived` / `$derived.by` for pure computations over `$effect`.
- Use `$effect` only as an escape hatch for true external synchronization (DOM libraries, third-party widgets). Prefer event handlers and function bindings for user-driven side effects.
- Never put business logic, arithmetic, or HTTP calls inside `.svelte` component scripts.

---

## 4. UI Layer Constraints

### Radical Component Thinness

Svelte components (`.svelte`) must only execute DOM assembly, style coordination, and bridge user actions directly to domain state instances. Zero arithmetic, validation chains, or HTTP fetching logic are allowed within `<script lang="ts">` sections of components.

```svelte
<!-- src/routes/user/+page.svelte -->
<script lang="ts">
	import { UserViewState } from '$lib/state/user-view.svelte';

	// Single source of truth instantiated locally or injected via Context
	const userView = new UserViewState();

	let searchId = $state('');
</script>

<div class="user-container">
	<input type="text" bind:value={searchId} placeholder="Enter User ID..." />
	<button onclick={() => userView.load(searchId)}>Fetch Profile</button>

	{#if userView.isLoading}
		<p>Loading profile safely...</p>
	{:else if userView.error}
		<div class="error-banner">
			{#if userView.error._tag === 'UserNotFoundError'}
				<span>The user account does not exist.</span>
			{:else}
				<span>A communication failure occurred. Please retry.</span>
			{/if}
		</div>
	{:else if userView.data}
		<main class="profile-card">
			<h1>{userView.data.username}</h1>
			<p>Contact: {userView.data.email}</p>
		</main>
	{/if}
</div>
```

### Event & Binding Rules

- Use modern attribute bindings: `onclick`, `oninput`, etc. Never use legacy `on:click`.
- Prefer `bind:value` and function bindings over imperative DOM access.
- Avoid `class:active={isActive}`. Pass clean string expressions or computed arrays into the standard `class` attribute.

---

## 5. Strict Anti-Patterns (Refuse These)

Agents must refuse to generate or leave the following patterns in new code:

- **No Direct Throwing for Expected Failures** — Do not write `throw new Error(...)` for domain, network, or parsing failures. All expected errors must be treated as values and returned in an Effect error channel.
- **No Implicit Any / Unknown Leakage** — Never leave an endpoint payload, form value, or storage value unparsed. Every pipeline boundary must possess a corresponding structural `@effect/schema` decode.
- **No Class Directives** — Avoid `class:active={isActive}` in Svelte markup. Prefer `class={isActive ? "active" : ""}` or array expressions.
- **No Legacy Svelte Reactivity** — Refuse any code featuring:
  - `let` for component-level reactive state that should be `$state`
  - directional event syntax `on:click`
  - reactive definitions `$:`
  - `writable()` / `readable()` stores when `$state` / `$derived` suffice
  - `export let` props (use `$props()`)
  - `onMount` for data fetching (prefer load functions or Effect-driven view models)
- **No Business Logic in Components** — No arithmetic, validation chains, schema decoding, or HTTP calls inside `<script>` of `.svelte` files.
- **No Promise Wrapping in UI** — Never expose raw `Promise` or unhandled async state directly to the template. Always ground Effects into `$state` via a view-model module.

---

## Adapting to Existing Codebases

Before adding a new pattern or library, inspect the repo for existing choices around:

- error handling (Effect vs Result vs exceptions)
- schema parsing (`@effect/schema` vs Zod vs hand-written)
- dependency injection / layers
- testing strategy
- observability
- adapters / services
- module layout (`.svelte.ts` view models vs pure TS)

Prefer consistency inside the codebase. If existing code uses exception-style errors, do not rewrite the whole system. New code may still use typed Effect results internally, but it must integrate with existing framework handlers, logging, tracing, metrics, and error reporting.

At boundaries, translate between local typed errors and whatever the framework or existing code expects.

---

## Quick Reference for Agents

| Concern               | Preferred                                      | Avoid                               |
| --------------------- | ---------------------------------------------- | ----------------------------------- |
| Reactivity            | `$state`, `$derived`, `$effect`                | `let` + `$:` , `writable()`         |
| Props                 | `$props()`                                     | `export let`                        |
| Events                | `onclick={...}`                                | `on:click`                          |
| Errors                | Effect error channel + tagged classes          | `throw` for expected failures       |
| Parsing               | `@effect/schema` + branded types               | Raw `JSON.parse` / untyped payloads |
| Domain logic location | Pure Effect modules + `.svelte.ts` view models | Inside `.svelte` `<script>`         |
| Component thickness   | DOM + event bridging only                      | Validation, fetch, arithmetic       |
| Class binding         | `class={expr}` or array                        | `class:name={bool}`                 |

When in doubt: make the error track explicit, keep the component thin, and parse at the boundary.
