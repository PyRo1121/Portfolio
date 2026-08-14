import { Effect, Redacted } from 'effect';
import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
import { fetchWeeklySnapshot } from './github-api';

const RETRY_DELAYS_MS = [700, 1_600] as const;

type Fetch = typeof globalThis.fetch;

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Load one live private snapshot with bounded retries around the upstream collection pipeline. */
export async function loadLiveDashboardSnapshot(
	fetch: Fetch,
	username: string,
	token: string,
	now: Date
): Promise<GitHubDashboardSnapshot> {
	let lastFailure: unknown = new Error('GitHub refresh did not start.');
	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
		const exit = await Effect.runPromiseExit(
			fetchWeeklySnapshot(fetch, { username, token: Redacted.make(token) }, now)
		);
		if (exit._tag === 'Success') return exit.value;
		lastFailure = exit.cause;
		const wait = RETRY_DELAYS_MS[attempt];
		if (wait !== undefined) await delay(wait);
	}
	throw lastFailure;
}
