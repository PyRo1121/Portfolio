import { describe, expect, it } from 'vitest';
import type { CareerOpportunity, CareerSnapshot } from './career-accountability';
import { createOwnerBriefingView } from './owner-briefing';

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

function snapshot(opportunities: ReadonlyArray<CareerOpportunity>): CareerSnapshot {
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

describe('createOwnerBriefingView', () => {
	it('uses the earliest dated follow-up as primary and counts extras', () => {
		const view = createOwnerBriefingView(
			snapshot([
				opportunity({
					id: 'later',
					company: 'Later Co',
					nextAction: 'Send note',
					nextActionDue: '2026-08-20'
				}),
				opportunity({
					id: 'today',
					company: 'Today Co',
					nextAction: 'Prep call',
					nextActionDue: '2026-08-17'
				})
			]),
			'2026-08-17'
		);
		expect(view._tag).toBe('Ready');
		if (view._tag !== 'Ready') return;
		expect(view.primary.opportunityId).toBe('today');
		expect(view.primary.tone).toBe('today');
		expect(view.extraCount).toBe(1);
	});

	it('omits extras when only one follow-up exists', () => {
		const view = createOwnerBriefingView(
			snapshot([
				opportunity({
					id: 'only',
					company: 'Solo',
					nextAction: 'Apply',
					nextActionDue: '2026-08-17'
				})
			]),
			'2026-08-17'
		);
		expect(view._tag).toBe('Ready');
		if (view._tag !== 'Ready') return;
		expect(view.extraCount).toBe(0);
	});

	it('returns empty when Career is present but nothing is due', () => {
		const view = createOwnerBriefingView(snapshot([]), '2026-08-17');
		expect(view).toEqual({ _tag: 'Empty', extraCount: 0 });
	});

	it('returns unavailable when Career storage is missing', () => {
		const view = createOwnerBriefingView(
			null,
			'2026-08-17',
			'Career storage is temporarily unavailable.'
		);
		expect(view).toEqual({
			_tag: 'Unavailable',
			reason: 'Career storage is temporarily unavailable.',
			extraCount: 0
		});
	});
});
