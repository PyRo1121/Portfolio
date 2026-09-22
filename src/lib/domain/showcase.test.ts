import { describe, expect, it } from 'vitest';
import { SHOWCASE_PROJECTS } from './showcase';

describe('public project showcase', () => {
	it('features the two active projects with usable public destinations', () => {
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
	});
});
