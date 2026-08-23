import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createPublicPortfolioEvidence } from './public-portfolio-view';

const demo = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-23T12:25:22.423Z'), 'octocat', 'test fixture')
);

describe('createPublicPortfolioEvidence', () => {
	it('projects a bounded summary from a complete live snapshot', () => {
		const live = {
			...demo,
			source: { _tag: 'Live', label: 'GitHub API' } as const
		};

		expect(createPublicPortfolioEvidence(live)).toEqual({
			_tag: 'Current',
			activeRepositories: live.intelligence.account.activeRepositories,
			commits: live.totals.commits,
			generatedAt: live.generatedAt,
			generatedAtLabel: 'Aug 23, 12:25 UTC',
			periodLabel: live.period.label,
			provenance: 'Observed'
		});
	});

	it('labels demonstration snapshots without presenting them as observed evidence', () => {
		const evidence = createPublicPortfolioEvidence(demo);
		expect(evidence._tag).toBe('Current');
		if (evidence._tag === 'Current') {
			expect(evidence.provenance).toBe('Demonstration');
		}
	});

	it('keeps an unavailable snapshot explicit', () => {
		expect(createPublicPortfolioEvidence(null)).toEqual({
			_tag: 'Unavailable',
			reason: 'Live evidence is warming.'
		});
	});
});
