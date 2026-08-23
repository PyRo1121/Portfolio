import { Redacted } from 'effect';
import { describe, expect, it } from 'vitest';
import { parseGitHubOrganizationAccessConfig } from './github-organization-access';

describe('parseGitHubOrganizationAccessConfig', () => {
	it('distinguishes absent configuration from partial configuration', () => {
		expect(parseGitHubOrganizationAccessConfig({})).toEqual({ _tag: 'Unconfigured' });
		expect(
			parseGitHubOrganizationAccessConfig({
				token: 'organization-token'
			})
		).toEqual({
			_tag: 'Invalid',
			reason: 'GitHub organization access requires both a token and repository allowlist.'
		});
		expect(
			parseGitHubOrganizationAccessConfig({
				repositories: 'CodeLoud/codeloud'
			})
		).toEqual({
			_tag: 'Invalid',
			reason: 'GitHub organization access requires both a token and repository allowlist.'
		});
	});

	it('normalizes and deduplicates an exact repository allowlist', () => {
		const state = parseGitHubOrganizationAccessConfig({
			token: ' organization-token ',
			repositories:
				' CodeLoud/codeloud,CodeLoud/codeloud-voice,codeloud/CODELOUD-VOICE,CodeLoud/codeloud-relay '
		});
		expect(state._tag).toBe('Configured');
		if (state._tag !== 'Configured') return;
		expect(Redacted.value(state.config.token)).toBe('organization-token');
		expect(state.config.repositories).toEqual([
			'CodeLoud/codeloud',
			'codeloud/CODELOUD-VOICE',
			'CodeLoud/codeloud-relay'
		]);
	});

	it('rejects search qualifiers and path-like repository names', () => {
		for (const repositories of [
			'org:CodeLoud',
			'CodeLoud/codeloud repo:other/repo',
			'CodeLoud/../private',
			'CodeLoud/codeloud/extra'
		]) {
			const state = parseGitHubOrganizationAccessConfig({
				token: 'organization-token',
				repositories
			});
			expect(state).toEqual({
				_tag: 'Invalid',
				reason: 'GitHub organization repository allowlist was malformed or exceeded its bound.'
			});
		}
	});
});
