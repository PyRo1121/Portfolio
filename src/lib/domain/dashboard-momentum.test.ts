import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from './github-intelligence';
import { createDashboardMomentum } from './dashboard-momentum';
import { createDemoSnapshot } from './github-stats';

describe('createDashboardMomentum', () => {
	it('derives a bounded, evidence-based momentum readout', () => {
		const snapshot = createDemoIntelligence(
			createDemoSnapshot(new Date('2026-08-13T08:00:00Z'), 'octocat', 'test')
		);
		const momentum = createDashboardMomentum(snapshot);

		expect(momentum.score).toBeGreaterThanOrEqual(0);
		expect(momentum.score).toBeLessThanOrEqual(100);
		expect(momentum.activeDays).toBe(6);
		expect(momentum.label.length).toBeGreaterThan(0);
		expect(momentum.message).toContain('active days');
	});
});
