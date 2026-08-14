import { createHash } from 'node:crypto';
import { Schema } from 'effect';
import {
	CloudflareUsageSnapshotSchema,
	type CloudflareUsageRefreshResult,
	type CloudflareUsageSnapshot
} from '$lib/domain/cloudflare-usage';
import type { DashboardCacheStore } from './dashboard-snapshot-cache';

const CACHE_VERSION = 1;
const DEFAULT_FRESHNESS_MS = 15 * 60_000;
const CacheEnvelopeSchema = Schema.Struct({
	version: Schema.Literal(CACHE_VERSION),
	accountId: Schema.String,
	cachedAt: Schema.String,
	snapshot: CloudflareUsageSnapshotSchema
});

type CacheEnvelope = Schema.Schema.Type<typeof CacheEnvelopeSchema>;
type SnapshotLoader = () => Promise<CloudflareUsageSnapshot>;

/** Last-known-good Cloudflare cache entry. */
export type CloudflareUsageCacheRecord = {
	readonly snapshot: CloudflareUsageSnapshot;
	readonly cachedAt: string;
};

function cacheKey(accountId: string): string {
	return `cloudflare-${createHash('sha256').update(accountId).digest('hex')}.json`;
}

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/** Independent, versioned Cloudflare evidence cache with single-flight refresh. */
export class CloudflareUsageCache {
	readonly #store: DashboardCacheStore;
	readonly #freshnessMs: number;
	readonly #refreshes = new Map<string, Promise<CloudflareUsageRefreshResult>>();

	constructor(store: DashboardCacheStore, freshnessMs = DEFAULT_FRESHNESS_MS) {
		this.#store = store;
		this.#freshnessMs = freshnessMs;
	}

	async read(accountId: string): Promise<CloudflareUsageCacheRecord | null> {
		try {
			const encoded = await this.#store.get(cacheKey(accountId));
			if (encoded === null) return null;
			const parsed: unknown = JSON.parse(encoded);
			const envelope = Schema.decodeUnknownSync(CacheEnvelopeSchema)(parsed);
			if (envelope.accountId !== accountId) return null;
			return { snapshot: envelope.snapshot, cachedAt: envelope.cachedAt };
		} catch (cause) {
			console.warn('Ignoring unreadable Cloudflare evidence cache:', errorMessage(cause));
			return null;
		}
	}

	refresh(
		accountId: string,
		cached: CloudflareUsageCacheRecord | null,
		now: Date,
		loader: SnapshotLoader,
		force = false
	): Promise<CloudflareUsageRefreshResult> {
		if (
			!force &&
			cached !== null &&
			now.getTime() - Date.parse(cached.cachedAt) < this.#freshnessMs
		) {
			return Promise.resolve({ _tag: 'Current', checkedAt: now.toISOString() });
		}
		const key = cacheKey(accountId);
		const active = this.#refreshes.get(key);
		if (active !== undefined) return active;
		const refresh = this.#runRefresh(accountId, loader).finally(() => this.#refreshes.delete(key));
		this.#refreshes.set(key, refresh);
		return refresh;
	}

	async #runRefresh(
		accountId: string,
		loader: SnapshotLoader
	): Promise<CloudflareUsageRefreshResult> {
		const attemptedAt = new Date().toISOString();
		try {
			const snapshot = await loader();
			if (snapshot.summary.availableProducts === 0 && snapshot.summary.measuredMetrics === 0) {
				return {
					_tag: 'Unavailable',
					attemptedAt,
					reason:
						'Cloudflare collection returned no readable evidence. Last-known-good data remains available.'
				};
			}
			const refreshedAt = new Date().toISOString();
			const envelope: CacheEnvelope = {
				version: CACHE_VERSION,
				accountId,
				cachedAt: refreshedAt,
				snapshot
			};
			await this.#store.put(cacheKey(accountId), JSON.stringify(envelope));
			return { _tag: 'Fresh', snapshot, refreshedAt };
		} catch (cause) {
			console.warn('Weeknote Cloudflare refresh failed:', errorMessage(cause));
			return {
				_tag: 'Unavailable',
				attemptedAt,
				reason:
					'Cloudflare refresh is delayed. Last-known-good Cloudflare evidence remains available.'
			};
		}
	}
}

const cachesByStore = new WeakMap<DashboardCacheStore, CloudflareUsageCache>();

/** Return one process-local Cloudflare refresh coordinator for each KV binding. */
export function cloudflareUsageCacheFor(store: DashboardCacheStore): CloudflareUsageCache {
	const existing = cachesByStore.get(store);
	if (existing !== undefined) return existing;
	const cache = new CloudflareUsageCache(store);
	cachesByStore.set(store, cache);
	return cache;
}
