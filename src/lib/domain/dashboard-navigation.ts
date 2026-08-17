import type { CloudflareUsageSnapshot } from './cloudflare-usage';
import { createCraftIntelligence } from './dashboard-craft';
import type { TelemetryView } from './telemetry-view';
import { createTodayIntelligence } from './dashboard-today';
import type { ViewerActivityProjection } from './dashboard-viewer-time';
import type { DashboardWorkspace } from './dashboard-workspace';
import type { GitHubDashboardSnapshot } from './github-intelligence';

export type WorkspaceSignal = {
	readonly value: string;
	readonly label: string;
	readonly tone: 'neutral' | 'attention';
};

/** Derive one compact, exact information-scent signal for each workspace. */
export function createWorkspaceSignals(
	snapshot: GitHubDashboardSnapshot,
	projection: ViewerActivityProjection,
	cloudflare: CloudflareUsageSnapshot | null = null,
	telemetry: TelemetryView | null = null
): Readonly<Record<DashboardWorkspace, WorkspaceSignal>> {
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
		},
		cloudflare: {
			value: cloudflare === null ? '—' : String(cloudflare.summary.availableProducts),
			label: cloudflare === null ? 'pending' : 'products',
			tone:
				cloudflare !== null &&
				cloudflare.summary.availableProducts < cloudflare.summary.totalProducts
					? 'attention'
					: 'neutral'
		},
		career: { value: '—', label: 'locked', tone: 'neutral' },
		telemetry:
			telemetry === null
				? { value: '—', label: 'visits', tone: 'neutral' }
				: { value: String(telemetry.pageViews), label: 'visits', tone: 'neutral' }
	};
}
