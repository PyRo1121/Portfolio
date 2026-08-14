import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createCraftIntelligence } from './dashboard-craft';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-13T08:00:00Z'), 'octocat', 'test')
);

describe('createCraftIntelligence', () => {
	it('separates observed and inferred quality signals', () => {
		const craft = createCraftIntelligence(snapshot);
		expect(craft.score).toBeGreaterThanOrEqual(0);
		expect(craft.score).toBeLessThanOrEqual(100);
		expect(craft.observed.successfulChecks).toBe(7);
		expect(craft.inferred.categories.reduce((total, category) => total + category.commits, 0)).toBe(
			snapshot.intelligence.commits.length
		);
		expect(craft.unavailable).toContain('Code coverage — no consistent coverage artifact exposed');
	});
});
