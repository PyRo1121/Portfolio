import { Effect, Redacted } from 'effect';
import { describe, expect, it } from 'vitest';
import { fetchWeeklySnapshot } from './github-api';
import type { GitHubRepositorySliceCache } from './github-repository-slice-cache';

const unusedRepositoryCache: GitHubRepositorySliceCache = {
	read: async () => null,
	write: async () => 'Persisted'
};

function requestUrl(input: RequestInfo | URL): URL {
	if (typeof input === 'string') return new URL(input);
	if (input instanceof URL) return input;
	return new URL(input.url);
}

function userResponse(): Response {
	return Response.json({
		login: 'octocat',
		node_id: 'MDQ6VXNlcjE=',
		name: 'Octo Cat',
		avatar_url: 'https://avatars.githubusercontent.com/u/1',
		html_url: 'https://github.com/octocat',
		public_repos: 1,
		followers: 1
	});
}

describe('fetchWeeklySnapshot repository inventory', () => {
	it('requests repositories from ownership, collaboration, and organization membership', async () => {
		const requested: URL[] = [];
		const fetch: typeof globalThis.fetch = async (input) => {
			const url = requestUrl(input);
			requested.push(url);
			if (url.pathname === '/user') return userResponse();
			if (url.pathname === '/users/octocat/events') return Response.json([]);
			return new Response(null, { status: 503 });
		};

		await Effect.runPromiseExit(
			fetchWeeklySnapshot(
				fetch,
				{ username: 'octocat', token: Redacted.make('test-token') },
				new Date('2026-08-23T12:00:00Z'),
				unusedRepositoryCache
			)
		);

		const inventoryRequest = requested.find((url) => url.pathname === '/user/repos');
		expect(inventoryRequest?.searchParams.get('affiliation')).toBe(
			'owner,collaborator,organization_member'
		);
	});

	it('uses the organization token only for allowlisted organization inventory', async () => {
		const requested: Array<{ readonly path: string; readonly authorization: string | null }> = [];
		const fetch: typeof globalThis.fetch = async (input, init) => {
			const url = requestUrl(input);
			const authorization = new Headers(init?.headers).get('Authorization');
			requested.push({ path: url.pathname, authorization });
			if (url.pathname === '/user') return userResponse();
			if (url.pathname === '/users/octocat/events') return Response.json([]);
			if (url.pathname === '/user/repos') return Response.json([]);
			return new Response(null, { status: 503 });
		};

		await Effect.runPromiseExit(
			fetchWeeklySnapshot(
				fetch,
				{
					username: 'octocat',
					token: Redacted.make('primary-token'),
					organization: {
						token: Redacted.make('organization-token'),
						repositories: ['CodeLoud/codeloud-voice']
					}
				},
				new Date('2026-08-23T12:00:00Z'),
				unusedRepositoryCache
			)
		);

		expect(requested.filter(({ path }) => path === '/user')).toEqual([
			{ path: '/user', authorization: 'Bearer primary-token' },
			{ path: '/user', authorization: 'Bearer organization-token' }
		]);
		expect(requested.find(({ path }) => path === '/repos/CodeLoud/codeloud-voice')).toEqual({
			path: '/repos/CodeLoud/codeloud-voice',
			authorization: 'Bearer organization-token'
		});
	});
});
