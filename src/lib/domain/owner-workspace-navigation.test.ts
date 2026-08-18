import { describe, expect, it } from 'vitest';
import type { CareerOpportunity, CareerSnapshot } from './career-accountability';
import { createOwnerBriefingView } from './owner-briefing';
import { createOwnerWorkspaceSignals } from './owner-workspace-navigation';

function opportunity(
	partial: Pick<CareerOpportunity, 'id' | 'company' | 'nextAction' | 'nextActionDue'>
): CareerOpportunity {
	return {
		role: 'Engineer',
		jobUrl: null,
		stage: 'Applied',
		contact: null,
		resumeVersion: null,
		notes: null,
		createdAt: '2026-08-01T00:00:00.000Z',
		updatedAt: '2026-08-01T00:00:00.000Z',
		...partial
	};
}

function career(opportunities: ReadonlyArray<CareerOpportunity>): CareerSnapshot {
	return {
		opportunities,
		commitments: [],
		stories: [],
		summary: {
			activeOpportunities: opportunities.length,
			interviewing: 0,
			overdueActions: 0,
			openCommitments: 0,
			storyDrafts: 0
		}
	};
}

describe('createOwnerWorkspaceSignals', () => {
	it('scopes signals to owner workspace ids and marks due briefing attention', () => {
		const snapshot = career([
			opportunity({
				id: 'today',
				company: 'Today Co',
				nextAction: 'Prep call',
				nextActionDue: '2026-08-17'
			})
		]);
		const signals = createOwnerWorkspaceSignals({
			briefing: createOwnerBriefingView(snapshot, '2026-08-17'),
			career: snapshot,
			today: '2026-08-17',
			cloudflare: null,
			telemetry: null,
			registry: { projects: [] }
		});
		expect(Object.keys(signals).sort()).toEqual(
			['briefing', 'career', 'cloudflare', 'mappings', 'telemetry'].sort()
		);
		expect(signals.briefing).toEqual({ value: '1', label: 'due', tone: 'attention' });
		expect(signals.mappings.value).toBe('0');
		expect(signals.cloudflare.value).toBe('—');
		expect(signals.telemetry.value).toBe('—');
	});
});
