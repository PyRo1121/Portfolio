import { describe, expect, it } from 'vitest';
import {
	createCareerStoryEvidenceOptions,
	observedCareerStoryEvidence
} from './career-story-evidence';
import { createDemoIntelligence, type GitHubDashboardSnapshot } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';

const demo = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-14T12:00:00.000Z'), 'octocat', 'test')
);
const live: GitHubDashboardSnapshot = {
	...demo,
	source: { _tag: 'Live', label: 'Live test evidence' },
	intelligence: {
		...demo.intelligence,
		delivery: {
			...demo.intelligence.delivery,
			artifacts: [
				{
					kind: 'Issue',
					title: 'Close customer gap',
					repository: 'octocat/product',
					url: 'https://github.com/octocat/product/issues/7',
					occurredAt: '2026-08-14T11:00:00.000Z',
					status: 'shipped',
					commitSha: null,
					detail: 'Closed issue'
				},
				{
					kind: 'Release',
					title: 'v2.0.0-rc.1',
					repository: 'octocat/product',
					url: 'https://github.com/octocat/product/releases/tag/v2.0.0-rc.1',
					occurredAt: '2026-08-14T12:00:00.000Z',
					status: 'shipped',
					commitSha: null,
					detail: 'Published prerelease'
				},
				{
					kind: 'PullRequest',
					title: 'Ship observed evidence',
					repository: 'octocat/product',
					url: 'https://github.com/octocat/product/pull/8',
					occurredAt: '2026-08-13T12:00:00.000Z',
					status: 'shipped',
					commitSha: '8888888888888888888888888888888888888888',
					detail: 'Merged pull request'
				},
				{
					kind: 'Release',
					title: 'v1.0.0',
					repository: 'octocat/product',
					url: 'https://github.com/octocat/product/releases/tag/v1.0.0',
					occurredAt: '2026-08-12T12:00:00.000Z',
					status: 'shipped',
					commitSha: null,
					detail: 'Published stable release'
				},
				{
					kind: 'WorkflowRun',
					title: 'CI',
					repository: 'octocat/product',
					url: 'https://github.com/octocat/product/actions/runs/9',
					occurredAt: '2026-08-14T13:00:00.000Z',
					status: 'shipped',
					commitSha: '9999999999999999999999999999999999999999',
					detail: 'Successful workflow'
				}
			]
		}
	}
};

describe('career story evidence', () => {
	it('offers only shipped delivery outcomes from live evidence in documented rank order', () => {
		expect(createCareerStoryEvidenceOptions(demo)).toEqual([]);
		const options = createCareerStoryEvidenceOptions(live);
		expect(options.map((option) => option.kind)).toEqual([
			'Release',
			'PullRequest',
			'Issue',
			'Release'
		]);
		expect(options.map((option) => option.url)).not.toContain(
			'https://github.com/octocat/product/actions/runs/9'
		);
	});

	it('resolves only an exact retained URL into durable observed metadata', () => {
		const options = createCareerStoryEvidenceOptions(live);
		const selected = observedCareerStoryEvidence(
			options,
			'https://github.com/octocat/product/pull/8',
			new Date('2026-08-14T20:00:00.000Z')
		);
		expect(selected).toMatchObject({
			_tag: 'Observed',
			source: 'GitHub',
			kind: 'PullRequest',
			repository: 'octocat/product',
			observedAt: '2026-08-14T20:00:00.000Z'
		});
		expect(
			observedCareerStoryEvidence(
				options,
				'https://example.test/injected',
				new Date('2026-08-14T20:00:00.000Z')
			)
		).toBeNull();
	});
});
