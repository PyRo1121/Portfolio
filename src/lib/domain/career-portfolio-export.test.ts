import { describe, expect, it } from 'vitest';
import type { CareerStory } from './career-accountability';
import { createCareerPortfolioMarkdown } from './career-portfolio-export';

function story(overrides: Partial<CareerStory>): CareerStory {
	return {
		id: '07f332f3-aa2d-4233-ab1d-497463ce84e2',
		title: 'Private story',
		problem: 'Private problem',
		action: 'Private action',
		outcome: 'Private outcome',
		evidenceUrl: null,
		visibility: 'Private',
		createdAt: '2026-08-10T00:00:00.000Z',
		updatedAt: '2026-08-10T00:00:00.000Z',
		...overrides
	};
}

describe('career portfolio export', () => {
	it('exports only ShareDraft stories and escapes active Markdown or HTML', () => {
		const exported = createCareerPortfolioMarkdown(
			[
				story({ title: 'Never disclose me', problem: 'owner@example.test' }),
				story({
					id: 'a699ff38-2c66-4ddd-8511-d69ed83d3426',
					title: 'Product *delivery*',
					problem: '<script>alert(1)</script>',
					action: 'Built [a private link](javascript:alert(1)).',
					outcome: 'Shipped a useful result.',
					evidenceUrl: 'https://example.test/evidence',
					visibility: 'ShareDraft'
				}),
				story({
					id: 'c7647ef2-ced2-466f-b3ea-e9e10873993d',
					title: 'Unsafe legacy link',
					evidenceUrl: 'javascript:alert(1)',
					visibility: 'ShareDraft'
				})
			],
			new Date('2026-08-14T20:00:00.000Z')
		);

		expect(exported.storyCount).toBe(2);
		expect(exported.filename).toBe('weeknote-portfolio-draft.md');
		expect(exported.body).toContain('Product \\*delivery\\*');
		expect(exported.body).toContain('&lt;script&gt;alert\\(1\\)&lt;/script&gt;');
		expect(exported.body).toContain('[Evidence](https://example.test/evidence)');
		expect(exported.body).not.toContain('Never disclose me');
		expect(exported.body).not.toContain('owner@example.test');
		expect(exported.body).not.toContain('[Evidence](javascript:');
		expect(exported.body).toContain('\\[a private link\\]\\(javascript:alert\\(1\\)\\)');
		expect(exported.body).toContain('Review this draft before sharing');
	});

	it('returns an explicit empty draft when no story is shareable', () => {
		const exported = createCareerPortfolioMarkdown(
			[story({ title: 'Still private' })],
			new Date('2026-08-14T20:00:00.000Z')
		);
		expect(exported.storyCount).toBe(0);
		expect(exported.body).toContain('No stories are currently marked ShareDraft');
		expect(exported.body).not.toContain('Still private');
	});
});
