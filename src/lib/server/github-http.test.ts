import { describe, expect, it } from 'vitest';
import { githubRequestHeaders } from './github-http';

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
