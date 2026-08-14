import { describe, expect, it } from 'vitest';
import type { RepositoryIntelligenceInput } from '$lib/domain/github-intelligence';
import type { DashboardCacheStore } from './dashboard-snapshot-cache';
import {
	createGitHubRepositorySliceCache,
	type GitHubRepositorySliceKey
} from './github-repository-slice-cache';

function repository(fullName = 'octocat/product'): RepositoryIntelligenceInput {
	const [owner, name] = fullName.split('/');
	return {
		name: name ?? owner ?? fullName,
		fullName,
		url: `https://github.com/${fullName}`,
		description: 'Private product repository',
		isPrivate: true,
		isFork: false,
		isArchived: false,
		imageUrl: 'https://example.test/image.png',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		pushedAt: new Date('2026-08-14T12:00:00.000Z'),
		primaryLanguage: 'TypeScript',
		primaryLanguageColor: '#3178c6',
		languages: [{ name: 'TypeScript', color: '#3178c6', bytes: 100 }],
		stars: 1,
		forks: 0,
		diskUsageKb: 200,
		openIssues: 1,
		openPullRequests: 0,
		defaultBranch: 'main',
		previousCommits: 2,
		commits: [
			{
				sha: 'abc123',
				message: 'Ship evidence',
				committedAt: new Date('2026-08-14T11:00:00.000Z'),
				url: `https://github.com/${fullName}/commit/abc123`,
				additions: 10,
				deletions: 2,
				changedFiles: 3
			}
		]
	};
}

function fixture() {
	const values = new Map<string, string>();
	const store: DashboardCacheStore = {
		get: async (key) => values.get(key) ?? null,
		put: async (key, value) => {
			values.set(key, value);
		}
	};
	return { values, cache: createGitHubRepositorySliceCache(store) };
}

const key: GitHubRepositorySliceKey = {
	username: 'octocat',
	repository: 'octocat/product',
	windowStart: '2026-08-08T00:00:00.000Z',
	windowEnd: '2026-08-15T00:00:00.000Z'
};

describe('GitHub repository slice cache', () => {
	it('round-trips typed repository evidence for the exact canonical window', async () => {
		const { cache, values } = fixture();
		await cache.write(
			key,
			{ repository: repository(), releases: [], previousReleaseCount: 0 },
			'2026-08-14T20:00:00.000Z'
		);
		const cached = await cache.read(key);
		expect(cached?.cachedAt).toBe('2026-08-14T20:00:00.000Z');
		expect(cached?.slice.repository.fullName).toBe('octocat/product');
		expect(cached?.slice.repository.createdAt).toBeInstanceOf(Date);
		expect(cached?.slice.repository.commits[0]?.committedAt).toBeInstanceOf(Date);
		const nextWindow = {
			...key,
			windowStart: '2026-08-09T00:00:00.000Z',
			windowEnd: '2026-08-16T00:00:00.000Z'
		};
		expect(await cache.read(nextWindow)).toBeNull();
		await cache.write(
			nextWindow,
			{ repository: repository(), releases: [], previousReleaseCount: 0 },
			'2026-08-15T20:00:00.000Z'
		);
		expect(values.size).toBe(1);
		expect((await cache.read(nextWindow))?.cachedAt).toBe('2026-08-15T20:00:00.000Z');
	});

	it('reports unavailable persistence without discarding fresh upstream evidence', async () => {
		const cache = createGitHubRepositorySliceCache({
			get: async () => null,
			put: async () => Promise.reject(new Error('KV unavailable'))
		});
		expect(
			await cache.write(
				key,
				{ repository: repository(), releases: [], previousReleaseCount: 0 },
				'2026-08-14T20:00:00.000Z'
			)
		).toBe('Unavailable');
	});

	it('rejects unknown forward versions', async () => {
		const { cache, values } = fixture();
		await cache.write(
			key,
			{ repository: repository(), releases: [], previousReleaseCount: 0 },
			'2026-08-14T20:00:00.000Z'
		);
		const [storageKey] = values.keys();
		expect(storageKey).toBeDefined();
		let envelope: Record<string, unknown>;
		try {
			envelope = JSON.parse(values.get(storageKey!)!) as Record<string, unknown>;
		} catch (cause) {
			throw new Error('Test cache envelope was not valid JSON.', { cause });
		}
		values.set(storageKey!, JSON.stringify({ ...envelope, version: 2 }));
		expect(await cache.read(key)).toBeNull();
	});
});
