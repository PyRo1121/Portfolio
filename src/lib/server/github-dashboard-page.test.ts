import { describe, expect, it } from 'vitest';
import { configuredGitHubUsername, DEFAULT_USERNAME } from './github-dashboard-page';

describe('configuredGitHubUsername', () => {
	it('prefers the process env username, then the Worker binding, then the default', () => {
		expect(configuredGitHubUsername(' env-user ', 'platform-user')).toBe('env-user');
		expect(configuredGitHubUsername('  ', 'platform-user')).toBe('platform-user');
		expect(configuredGitHubUsername(undefined, undefined)).toBe(DEFAULT_USERNAME);
	});
});
