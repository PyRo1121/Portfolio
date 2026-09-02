import type { Fetcher } from '@cloudflare/workers-types';
import { Schema } from 'effect';
import { RefreshLeaseDecisionSchema, type RefreshLeaseDecision } from '$lib/domain/refresh-lease';

const LEASE_TTL_MS = 5 * 60_000;
const MAX_CLIENT_RETRY_MS = 5_000;

type CoordinatorResponse = {
	readonly ok: boolean;
	readonly status: number;
	readonly json: () => Promise<unknown>;
};

type CoordinatorFetch = (
	input: string,
	init: {
		readonly method: 'POST';
		readonly headers: Readonly<Record<string, string>>;
		readonly body: string;
	}
) => Promise<CoordinatorResponse>;

export type RefreshLeaseClient = {
	readonly acquire: (key: string) => Promise<RefreshLeaseDecision>;
	readonly release: (key: string, token: string) => Promise<void>;
};

class RefreshLeaseServiceError extends Error {
	readonly _tag = 'RefreshLeaseServiceError';

	constructor(message: string) {
		super(message);
		this.name = 'RefreshLeaseServiceError';
	}
}

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/** Create the internal service-binding adapter used by cache publishers. */
export function createRefreshLeaseClient(fetch: CoordinatorFetch): RefreshLeaseClient {
	return {
		acquire: async (key) => {
			const response = await fetch('https://refresh-coordinator/acquire', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ key, ttlMs: LEASE_TTL_MS })
			});
			if (!response.ok) {
				throw new RefreshLeaseServiceError(
					`Refresh coordinator acquire returned HTTP ${String(response.status)}.`
				);
			}
			return Schema.decodeUnknownSync(RefreshLeaseDecisionSchema)(await response.json());
		},
		release: async (key, token) => {
			const response = await fetch('https://refresh-coordinator/release', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ key, token })
			});
			if (!response.ok) {
				throw new RefreshLeaseServiceError(
					`Refresh coordinator release returned HTTP ${String(response.status)}.`
				);
			}
		}
	};
}

const clientsByFetcher = new WeakMap<Fetcher, RefreshLeaseClient>();

/** Return one service client per runtime binding. */
export function refreshLeaseClientFor(fetcher: Fetcher): RefreshLeaseClient {
	const existing = clientsByFetcher.get(fetcher);
	if (existing !== undefined) return existing;
	const client = createRefreshLeaseClient((input, init) => fetcher.fetch(input, init));
	clientsByFetcher.set(fetcher, client);
	return client;
}

/** Run one cache publication under a cross-isolate lease. */
export async function runWithRefreshLease<Result>(options: {
	readonly client: RefreshLeaseClient | undefined;
	readonly key: string;
	readonly work: () => Promise<Result>;
	readonly deferred: (retryAfterMs: number) => Result;
}): Promise<Result> {
	if (options.client === undefined) return options.work();

	let decision: RefreshLeaseDecision;
	try {
		decision = await options.client.acquire(options.key);
	} catch (cause) {
		console.warn(
			'Refresh coordinator acquire failed; continuing without a lease:',
			errorMessage(cause)
		);
		return options.work();
	}
	if (decision._tag === 'Busy') {
		return options.deferred(Math.min(MAX_CLIENT_RETRY_MS, decision.retryAfterMs));
	}

	try {
		return await options.work();
	} finally {
		try {
			await options.client.release(options.key, decision.token);
		} catch (cause) {
			console.warn('Refresh coordinator release failed:', errorMessage(cause));
		}
	}
}
