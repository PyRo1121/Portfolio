import { describe, expect, it } from 'vitest';
import { githubFetch, githubRequestHeaders } from './github-http';

describe('githubFetch', () => {
	it('aborts an upstream request that exceeds its deadline', async () => {
		const neverSettles = ((_input: RequestInfo | URL, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
			})) as typeof globalThis.fetch;
		await expect(githubFetch(neverSettles, '/user', {}, 10)).rejects.toMatchObject({
			name: 'TimeoutError'
		});
	});
});

describe('githubRequestHeaders', () => {
	it('always supplies GitHub required API and user-agent headers', () => {
		expect(githubRequestHeaders()).toEqual({
			Accept: 'application/vnd.github+json',
			'User-Agent': 'Weeknote/1.0',
			'X-GitHub-Api-Version': '2022-11-28'
		});
	});

	it('adds authorization and JSON content type only when requested', () => {
		expect(githubRequestHeaders({ authorization: 'Bearer secret', json: true })).toEqual({
			Accept: 'application/vnd.github+json',
			'User-Agent': 'Weeknote/1.0',
			'X-GitHub-Api-Version': '2022-11-28',
			Authorization: 'Bearer secret',
			'Content-Type': 'application/json'
		});
	});
});
