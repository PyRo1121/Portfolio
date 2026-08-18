import type { CareerSnapshot } from './career-accountability';
import { createCareerNavigationSignal } from './career-navigation';
import type { CloudflareUsageSnapshot } from './cloudflare-usage';
import type { WorkspaceSignal } from './dashboard-navigation';
import type { OwnerWorkspace } from './dashboard-workspace';
import type { OwnerBriefingView } from './owner-briefing';
import type { OwnerProjectSnapshot } from './owner-project';
import { createOwnerProjectNavigationSignal } from './owner-project-navigation';
import type { TelemetryView } from './telemetry-view';

/** Compact rail signals for the five owner-home workspaces. */
export type OwnerWorkspaceSignals = Readonly<Record<OwnerWorkspace, WorkspaceSignal>>;

/** Derive owner-rail signals from briefing, Career, usage, telemetry, and mappings. */
export function createOwnerWorkspaceSignals(input: {
	readonly briefing: OwnerBriefingView;
	readonly career: CareerSnapshot | null;
	readonly today: string;
	readonly cloudflare: CloudflareUsageSnapshot | null;
	readonly telemetry: TelemetryView | null;
	readonly registry: OwnerProjectSnapshot | null;
}): OwnerWorkspaceSignals {
	return {
		briefing: briefingSignal(input.briefing),
		career: createCareerNavigationSignal(input.career, input.today),
		cloudflare:
			input.cloudflare === null
				? { value: '—', label: 'pending', tone: 'neutral' }
				: {
						value: String(input.cloudflare.summary.provisionedResources),
						label: 'resources',
						tone: 'neutral'
					},
		telemetry:
			input.telemetry === null
				? { value: '—', label: 'pending', tone: 'neutral' }
				: {
						value: String(input.telemetry.pageViews),
						label: 'views',
						tone: 'neutral'
					},
		mappings: createOwnerProjectNavigationSignal(input.registry)
	};
}

function briefingSignal(briefing: OwnerBriefingView): WorkspaceSignal {
	if (briefing._tag === 'Unavailable') {
		return { value: '—', label: 'offline', tone: 'neutral' };
	}
	if (briefing._tag === 'Empty') {
		return { value: '0', label: 'clear', tone: 'neutral' };
	}
	return {
		value: String(briefing.extraCount + 1),
		label: 'due',
		tone:
			briefing.primary.tone === 'overdue' || briefing.primary.tone === 'today'
				? 'attention'
				: 'neutral'
	};
}
