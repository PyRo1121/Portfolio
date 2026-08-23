import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createWorkspaceSignals } from './dashboard-navigation';
import { createViewerActivityProjection } from './dashboard-viewer-time';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-13T18:00:00Z'), 'octocat', 'test')
);

describe('createWorkspaceSignals', () => {
	it('exposes exact existing evidence as navigation information scent', () => {
		const projection = createViewerActivityProjection(snapshot, 'America/New_York');
		const signals = createWorkspaceSignals(snapshot, projection);
		expect(signals.brief.value).toBe(String(snapshot.totals.commits));
		expect(signals.delivery.value).toBe(String(snapshot.intelligence.delivery.outcomes));
		expect(signals.repositories.value).toBe(
			String(snapshot.intelligence.account.activeRepositories)
		);
		expect(signals.activity.value).toBe(String(snapshot.intelligence.commits.length));
	});

	it('headlines Checks with repositories that have latest-run evidence instead of a pass rate', () => {
		const projection = createViewerActivityProjection(snapshot, 'America/New_York');
		const signals = createWorkspaceSignals(snapshot, projection);
		expect(snapshot.intelligence.delivery.workflows.current.failed).toBeGreaterThan(0);
		expect(signals.craft).toEqual({
			value: '2',
			label: 'checked',
			tone: 'neutral'
		});
	});

	it('uses a quiet zero when no repository has latest-run evidence', () => {
		const withoutChecks: typeof snapshot = {
			...snapshot,
			intelligence: {
				...snapshot.intelligence,
				delivery: {
					...snapshot.intelligence.delivery,
					workflows: {
						...snapshot.intelligence.delivery.workflows,
						current: {
							...snapshot.intelligence.delivery.workflows.current,
							successful: 0,
							failed: 0,
							repositories: snapshot.intelligence.delivery.workflows.current.repositories.map(
								(repository) => ({ ...repository, latestRuns: [], recoveredFailures: 0 })
							)
						}
					}
				}
			}
		};
		const projection = createViewerActivityProjection(withoutChecks, 'America/New_York');
		expect(createWorkspaceSignals(withoutChecks, projection).craft).toEqual({
			value: '0',
			label: 'checked',
			tone: 'neutral'
		});
	});
});
