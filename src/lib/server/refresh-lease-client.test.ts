import { describe, expect, it, vi } from 'vitest';
import {
	createRefreshLeaseClient,
	runWithRefreshLease,
	type RefreshLeaseClient
} from './refresh-lease-client';

const TOKEN = '11111111-1111-4111-8111-111111111111';

describe('refresh lease client', () => {
	it('parses an acquired decision from the service binding', async () => {
		const fetch = vi.fn(async () =>
			Response.json({ _tag: 'Acquired', token: TOKEN, expiresAt: 301_000 })
		);
		const client = createRefreshLeaseClient(fetch);
		await expect(client.acquire('github:cache-key')).resolves.toEqual({
			_tag: 'Acquired',
			token: TOKEN,
			expiresAt: 301_000
		});
		expect(fetch).toHaveBeenCalledWith(
			'https://refresh-coordinator/acquire',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('defers without starting provider work when another isolate owns the lease', async () => {
		const work = vi.fn(async () => 'fresh');
		const client: RefreshLeaseClient = {
			acquire: async () => ({ _tag: 'Busy', retryAfterMs: 40_000 }),
			release: vi.fn()
		};
		const result = await runWithRefreshLease({
			client,
			key: 'github:cache-key',
			work,
			deferred: (retryAfterMs) => `deferred:${String(retryAfterMs)}`
		});
		expect(result).toBe('deferred:5000');
		expect(work).not.toHaveBeenCalled();
		expect(client.release).not.toHaveBeenCalled();
	});

	it('releases the holder token when provider work fails', async () => {
		const release = vi.fn(async () => undefined);
		const client: RefreshLeaseClient = {
			acquire: async () => ({ _tag: 'Acquired', token: TOKEN, expiresAt: 301_000 }),
			release
		};
		await expect(
			runWithRefreshLease({
				client,
				key: 'github:cache-key',
				work: () => Promise.reject(new Error('provider failed')),
				deferred: () => 'deferred'
			})
		).rejects.toThrow('provider failed');
		expect(release).toHaveBeenCalledWith('github:cache-key', TOKEN);
	});

	it('fails open when the coordinator cannot acquire a lease', async () => {
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const client: RefreshLeaseClient = {
			acquire: () => Promise.reject(new Error('binding unavailable')),
			release: vi.fn()
		};
		await expect(
			runWithRefreshLease({
				client,
				key: 'github:cache-key',
				work: async () => 'fresh',
				deferred: () => 'deferred'
			})
		).resolves.toBe('fresh');
		expect(warning).toHaveBeenCalledOnce();
		warning.mockRestore();
	});
});
