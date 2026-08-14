import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { RepositoryIntelligenceInput } from '$lib/domain/github-intelligence';
import { collectGitHubRepositorySlices } from './github-repository-collector';
import { createGitHubRepositorySliceCache } from './github-repository-slice-cache';

function repository(fullName: string): RepositoryIntelligenceInput {
	return {
		name: fullName.split('/')[1] ?? fullName,
		fullName,
		url: `https://github.com/${fullName}`,
		description: null,
		isPrivate: false,
		isFork: false,
		isArchived: false,
		imageUrl: 'https://example.test/image.png',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		pushedAt: new Date('2026-08-14T12:00:00.000Z'),
		primaryLanguage: 'TypeScript',
		primaryLanguageColor: '#3178c6',
		languages: [],
		stars: 0,
		forks: 0,
		diskUsageKb: 1,
		openIssues: 0,
		openPullRequests: 0,
		defaultBranch: 'main',
		previousCommits: 0,
		commits: []
	};
}

function refresh(fullName: string) {
	return {
		slice: { repository: repository(fullName), releases: [], previousReleaseCount: 0 },
		graphQLCost: 1,
		successfulGraphQLRequests: 1
	};
}

function cacheFixture() {
	const values = new Map<string, string>();
	return createGitHubRepositorySliceCache({
		get: async (key) => values.get(key) ?? null,
		put: async (key, value) => {
			values.set(key, value);
		}
	});
}

const names = Array.from({ length: 7 }, (_, index) => `octocat/repository-${index + 1}`);
const baseOptions = {
	username: 'octocat',
	repositoryNames: names,
	windowStart: '2026-08-08T00:00:00.000Z',
	windowEnd: '2026-08-15T00:00:00.000Z',
	now: new Date('2026-08-14T20:00:00.000Z')
};

describe('incremental GitHub repository collection', () => {
	it('bounds concurrent repository loads and caches every fresh slice', async () => {
		const cache = cacheFixture();
		let active = 0;
		let maximumActive = 0;
		const collection = await Effect.runPromise(
			collectGitHubRepositorySlices({
				...baseOptions,
				cache,
				load: (name) =>
					Effect.tryPromise({
						try: async () => {
							active += 1;
							maximumActive = Math.max(maximumActive, active);
							await new Promise((resolve) => setTimeout(resolve, 5));
							active -= 1;
							return refresh(name);
						},
						catch: (cause) => new Error(String(cause))
					})
			})
		);
		expect(collection.freshRepositories).toBe(7);
		expect(collection.staleRepositories).toEqual([]);
		expect(collection.graphQLCost).toBe(7);
		expect(collection.successfulGraphQLRequests).toBe(7);
		expect(maximumActive).toBeLessThanOrEqual(6);
		expect(maximumActive).toBeGreaterThan(1);
	});

	it('retains a failed same-window repository slice but rejects unmatched windows', async () => {
		const cache = cacheFixture();
		await Effect.runPromise(
			collectGitHubRepositorySlices({
				...baseOptions,
				cache,
				load: (name) => Effect.succeed(refresh(name))
			})
		);
		const staleName = names[2]!;
		const retained = await Effect.runPromise(
			collectGitHubRepositorySlices({
				...baseOptions,
				cache,
				load: (name) =>
					name === staleName
						? Effect.fail(new Error('repository timeout'))
						: Effect.succeed(refresh(name))
			})
		);
		expect(retained.freshRepositories).toBe(6);
		expect(retained.staleRepositories).toEqual([
			{ repository: staleName, cachedAt: '2026-08-14T20:00:00.000Z' }
		]);
		expect(retained.graphQLCost).toBe(6);
		expect(retained.successfulGraphQLRequests).toBe(6);

		const unmatched = await Effect.runPromiseExit(
			collectGitHubRepositorySlices({
				...baseOptions,
				windowStart: '2026-08-09T00:00:00.000Z',
				windowEnd: '2026-08-16T00:00:00.000Z',
				cache,
				load: () => Effect.fail(new Error('repository timeout'))
			})
		);
		expect(unmatched._tag).toBe('Failure');
	});
});
