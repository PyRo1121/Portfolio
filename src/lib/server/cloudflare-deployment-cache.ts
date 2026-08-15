import { createHash } from 'node:crypto';
import { Schema } from 'effect';
import {
	CloudflareDeploymentSnapshotSchema,
	type CloudflareDeploymentRefreshResult,
	type CloudflareDeploymentSnapshot
} from '$lib/domain/cloudflare-deployments';
import type { DashboardCacheStore } from './dashboard-snapshot-cache';

const CACHE_VERSION = 1;
const DEFAULT_FRESHNESS_MS = 15 * 60_000;
const CacheEnvelopeSchema = Schema.Struct({
	version: Schema.Literal(CACHE_VERSION),
	accountId: Schema.String,
	workerNames: Schema.Array(Schema.String),
	cachedAt: Schema.String,
	snapshot: CloudflareDeploymentSnapshotSchema
});

type CacheEnvelope = Schema.Schema.Type<typeof CacheEnvelopeSchema>;
type SnapshotLoader = () => Promise<CloudflareDeploymentSnapshot>;

export type CloudflareDeploymentCacheRecord = {
	readonly snapshot: CloudflareDeploymentSnapshot;
	readonly cachedAt: string;
};

function normalizedWorkerNames(workerNames: ReadonlyArray<string>): ReadonlyArray<string> {
	return [...new Set(workerNames.map((name) => name.trim()).filter(Boolean))].sort((left, right) =>
		left.localeCompare(right)
	);
}

function cacheKey(accountId: string, workerNames: ReadonlyArray<string>): string {
	const scope = `${accountId}\0${normalizedWorkerNames(workerNames).join('\0')}`;
	return `cloudflare-deployments-${createHash('sha256').update(scope).digest('hex')}.json`;
}

function sameNames(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
	return left.length === right.length && left.every((name, index) => name === right[index]);
}

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/** Independent last-known-good cache scoped to the exact linked Worker set. */
export class CloudflareDeploymentCache {
	readonly #store: DashboardCacheStore;
	readonly #freshnessMs: number;
	readonly #refreshes = new Map<string, Promise<CloudflareDeploymentRefreshResult>>();

	constructor(store: DashboardCacheStore, freshnessMs = DEFAULT_FRESHNESS_MS) {
		this.#store = store;
		this.#freshnessMs = freshnessMs;
	}

	async read(
		accountId: string,
		workerNames: ReadonlyArray<string>
	): Promise<CloudflareDeploymentCacheRecord | null> {
		const names = normalizedWorkerNames(workerNames);
		try {
			const encoded = await this.#store.get(cacheKey(accountId, names));
			if (encoded === null) return null;
			const envelope = Schema.decodeUnknownSync(CacheEnvelopeSchema)(
				JSON.parse(encoded) as unknown
			);
			if (envelope.accountId !== accountId || !sameNames(envelope.workerNames, names)) return null;
			return { snapshot: envelope.snapshot, cachedAt: envelope.cachedAt };
		} catch (cause) {
			console.warn('Ignoring unreadable Cloudflare deployment cache:', errorMessage(cause));
			return null;
		}
	}

	refresh(
		accountId: string,
		workerNames: ReadonlyArray<string>,
		cached: CloudflareDeploymentCacheRecord | null,
		now: Date,
		loader: SnapshotLoader,
		force = false
	): Promise<CloudflareDeploymentRefreshResult> {
		if (
			!force &&
			cached !== null &&
			now.getTime() - Date.parse(cached.cachedAt) < this.#freshnessMs
		) {
			return Promise.resolve({ _tag: 'Current', checkedAt: now.toISOString() });
		}
		const names = normalizedWorkerNames(workerNames);
		const key = cacheKey(accountId, names);
		const active = this.#refreshes.get(key);
		if (active !== undefined) return active;
		const refresh = this.#runRefresh(accountId, names, loader).finally(() =>
			this.#refreshes.delete(key)
		);
		this.#refreshes.set(key, refresh);
		return refresh;
	}

	async #runRefresh(
		accountId: string,
		workerNames: ReadonlyArray<string>,
		loader: SnapshotLoader
	): Promise<CloudflareDeploymentRefreshResult> {
		const attemptedAt = new Date().toISOString();
		try {
			const snapshot = await loader();
			if (
				workerNames.length > 0 &&
				snapshot.workers.every((worker) => worker.state === 'Unavailable')
			) {
				return {
					_tag: 'Unavailable',
					attemptedAt,
					reason:
						'No linked Worker deployment was readable. Last-known-good deployment evidence remains available.'
				};
			}
			const refreshedAt = new Date().toISOString();
			const envelope: CacheEnvelope = {
				version: CACHE_VERSION,
				accountId,
				workerNames,
				cachedAt: refreshedAt,
				snapshot
			};
			await this.#store.put(cacheKey(accountId, workerNames), JSON.stringify(envelope));
			return { _tag: 'Fresh', snapshot, refreshedAt };
		} catch (cause) {
			console.warn('Weeknote Cloudflare deployment refresh failed:', errorMessage(cause));
			return {
				_tag: 'Unavailable',
				attemptedAt,
				reason:
					'Cloudflare deployment refresh is delayed. Last-known-good deployment evidence remains available.'
			};
		}
	}
}

const cachesByStore = new WeakMap<DashboardCacheStore, CloudflareDeploymentCache>();

export function cloudflareDeploymentCacheFor(
	store: DashboardCacheStore
): CloudflareDeploymentCache {
	const existing = cachesByStore.get(store);
	if (existing !== undefined) return existing;
	const cache = new CloudflareDeploymentCache(store);
	cachesByStore.set(store, cache);
	return cache;
}
