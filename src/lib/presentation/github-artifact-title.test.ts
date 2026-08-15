import { describe, expect, it } from 'vitest';
import { formatGitHubArtifactTitle } from './github-artifact-title';

describe('formatGitHubArtifactTitle', () => {
	it('shortens machine-generated development build hashes', () => {
		expect(
			formatGitHubArtifactTitle('Development build 307428b68f16529ce18872594c4929b63b6b943a')
		).toBe('Development build 307428b');
	});

	it('preserves authored titles', () => {
		expect(formatGitHubArtifactTitle('Release the direct evidence dashboard')).toBe(
			'Release the direct evidence dashboard'
		);
	});
});
