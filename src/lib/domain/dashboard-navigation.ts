import { createChecksIntelligence } from './dashboard-craft';
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
	const checks = createChecksIntelligence(snapshot);
	const failedRuns = checks.history.failedRuns;
	return {
		today: { value: String(today.commits), label: 'today', tone: 'neutral' },
		brief: { value: String(snapshot.totals.commits), label: '7 days', tone: 'neutral' },
		delivery: {
			value: String(snapshot.intelligence.delivery.outcomes),
			label: 'outcomes',
			tone: failedRuns > 0 ? 'attention' : 'neutral'
		},
		craft: {
			value: String(checks.current.repositoriesWithEvidence),
			label: 'checked',
			tone: checks.current.attentionRepositories > 0 ? 'attention' : 'neutral'
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
