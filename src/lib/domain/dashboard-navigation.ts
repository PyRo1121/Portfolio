import { createCraftIntelligence } from './dashboard-craft';
import { createTodayIntelligence } from './dashboard-today';
import type { ViewerActivityProjection } from './dashboard-viewer-time';
import type { PublicWorkspace } from './dashboard-workspace';
import type { GitHubDashboardSnapshot } from './github-intelligence';

export type WorkspaceSignal = {
	readonly value: string;
	readonly label: string;
	readonly tone: 'neutral' | 'attention';
};

export type PublicWorkspaceSignals = Readonly<Record<PublicWorkspace, WorkspaceSignal>>;

/** Derive one compact signal for each public portfolio workspace. */
export function createWorkspaceSignals(
	snapshot: GitHubDashboardSnapshot,
	projection: ViewerActivityProjection
): PublicWorkspaceSignals {
	const today = createTodayIntelligence(snapshot, projection);
	const craft = createCraftIntelligence(snapshot);
	const failedChecks = craft.observed.failedChecks;
	return {
		today: { value: String(today.commits), label: 'today', tone: 'neutral' },
		brief: { value: String(snapshot.totals.commits), label: '7 days', tone: 'neutral' },
		delivery: {
			value: String(snapshot.intelligence.delivery.outcomes),
			label: 'outcomes',
			tone: failedChecks > 0 ? 'attention' : 'neutral'
		},
		craft: {
			value: String(failedChecks),
			label: 'failed',
			tone: failedChecks > 0 ? 'attention' : 'neutral'
		},
		repositories: {
			value: String(snapshot.intelligence.account.activeRepositories),
			label: 'active',
			tone: 'neutral'
		},
		activity: {
			value: String(snapshot.intelligence.commits.length),
			label: 'commits',
			tone: 'neutral'
		}
	};
}
