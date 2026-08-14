import { describe, expect, it } from 'vitest';
import { careerStoryFromRow } from './career-story-store';

const baseRow = {
	id: '07f332f3-aa2d-4233-ab1d-497463ce84e2',
	title: 'Observed delivery',
	problem: 'Evidence was fragmented.',
	action: 'Associated a retained outcome.',
	outcome: 'Created a durable interview story.',
	evidence_url: 'https://example.test/legacy',
	visibility: 'Private' as const,
	created_at: '2026-08-10T00:00:00.000Z',
	updated_at: '2026-08-14T20:00:00.000Z',
	evidence_source: null,
	evidence_kind: null,
	evidence_title: null,
	evidence_repository: null,
	evidence_canonical_url: null,
	evidence_occurred_at: null,
	evidence_observed_at: null
};

describe('career story row mapping', () => {
	it('keeps an unassociated legacy URL explicitly unavailable', () => {
		expect(careerStoryFromRow(baseRow).evidence).toMatchObject({
			_tag: 'Unavailable',
			url: 'https://example.test/legacy'
		});
	});

	it('uses complete server-verified association metadata as observed evidence', () => {
		const story = careerStoryFromRow({
			...baseRow,
			evidence_source: 'GitHub',
			evidence_kind: 'PullRequest',
			evidence_title: 'Ship durable evidence',
			evidence_repository: 'octocat/product',
			evidence_canonical_url: 'https://github.com/octocat/product/pull/8',
			evidence_occurred_at: '2026-08-13T12:00:00.000Z',
			evidence_observed_at: '2026-08-14T20:00:00.000Z'
		});
		expect(story.evidence).toEqual({
			_tag: 'Observed',
			source: 'GitHub',
			kind: 'PullRequest',
			title: 'Ship durable evidence',
			repository: 'octocat/product',
			url: 'https://github.com/octocat/product/pull/8',
			occurredAt: '2026-08-13T12:00:00.000Z',
			observedAt: '2026-08-14T20:00:00.000Z'
		});
	});
});
