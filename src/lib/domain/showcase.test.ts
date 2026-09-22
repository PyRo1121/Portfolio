import { describe, expect, it } from 'vitest';
import { SHOWCASE_PROJECTS, TOKEN_CONTROL_URL } from './showcase';

describe('public project showcase', () => {
	it('features the two primary projects and links the live side project separately', () => {
		expect(SHOWCASE_PROJECTS.map((project) => project.name)).toEqual(['OMG', 'DeployLint']);
		expect(SHOWCASE_PROJECTS[0]).toMatchObject({
			repoUrl: 'https://github.com/omg-cli/omg',
			demoUrl: 'https://getomg.xyz/'
		});
		expect(SHOWCASE_PROJECTS[1]).toMatchObject({
			repoUrl: null,
			demoUrl: 'https://deploylint.com/'
		});
		expect(JSON.stringify(SHOWCASE_PROJECTS)).not.toContain('tokens.latham.cloud');
		expect(TOKEN_CONTROL_URL).toBe('https://tokens.latham.cloud/');
	});
});
