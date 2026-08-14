import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
	parseCreateOpportunity,
	parseUpdateOpportunity,
	parseUpdateStory,
	summarizeCareer,
	type CareerCommitment,
	type CareerOpportunity
} from './career-accountability';
import { createCareerNavigationSignal } from './career-navigation';
import { createCareerAccountabilityView } from './career-workspace-view';

const opportunity: CareerOpportunity = {
	id: '22ba8ef8-33cf-4c6b-bbce-474b39533fb7',
	company: 'Acme',
	role: 'Full-stack engineer',
	jobUrl: 'https://example.test/jobs/1',
	stage: 'Applied',
	nextAction: 'Follow up with founder',
	nextActionDue: '2026-08-13',
	contact: null,
	resumeVersion: 'startup-v2',
	notes: null,
	createdAt: '2026-08-10T00:00:00.000Z',
	updatedAt: '2026-08-10T00:00:00.000Z'
};
const commitment: CareerCommitment = {
	id: '4fa48daa-7efb-4c20-9900-6f5c498d18dd',
	kind: 'Career',
	text: 'Send Acme follow-up',
	dueOn: '2026-08-13',
	status: 'Open',
	createdAt: '2026-08-10T00:00:00.000Z',
	updatedAt: '2026-08-10T00:00:00.000Z'
};

describe('career accountability domain', () => {
	it('parses and normalizes opportunity input at the form boundary', () => {
		const parsed = parseCreateOpportunity({
			company: '  Acme  ',
			role: ' Full-stack engineer ',
			jobUrl: 'https://example.test/jobs/1',
			stage: 'Interested',
			nextAction: '',
			nextActionDue: '',
			contact: '',
			resumeVersion: '',
			notes: ''
		});
		expect(Either.isRight(parsed)).toBe(true);
		if (Either.isRight(parsed)) {
			expect(parsed.right.company).toBe('Acme');
			expect(parsed.right.nextAction).toBeNull();
		}
	});

	it('rejects non-HTTP job links and invalid calendar dates', () => {
		const unsafeLink = parseCreateOpportunity({
			company: 'Acme',
			role: 'Engineer',
			jobUrl: 'javascript:alert(1)',
			stage: 'Interested',
			nextAction: '',
			nextActionDue: '',
			contact: '',
			resumeVersion: '',
			notes: ''
		});
		const invalidDate = parseCreateOpportunity({
			company: 'Acme',
			role: 'Engineer',
			jobUrl: '',
			stage: 'Interested',
			nextAction: 'Follow up',
			nextActionDue: '2026-02-31',
			contact: '',
			resumeVersion: '',
			notes: ''
		});
		expect(Either.isLeft(unsafeLink)).toBe(true);
		expect(Either.isLeft(invalidDate)).toBe(true);
	});

	it('requires an owner-scoped identifier when parsing opportunity edits', () => {
		const parsed = parseUpdateOpportunity({
			id: opportunity.id,
			company: ' Acme Labs ',
			role: opportunity.role,
			jobUrl: opportunity.jobUrl,
			stage: 'Contacted',
			nextAction: 'Schedule founder call',
			nextActionDue: '2026-08-15',
			contact: '',
			resumeVersion: 'startup-v3',
			notes: 'Private context'
		});
		expect(Either.isRight(parsed)).toBe(true);
		if (Either.isRight(parsed)) {
			expect(parsed.right).toMatchObject({
				id: opportunity.id,
				company: 'Acme Labs',
				stage: 'Contacted',
				nextActionDue: '2026-08-15'
			});
		}
		expect(Either.isLeft(parseUpdateOpportunity({ ...opportunity, id: 'not-a-uuid' }))).toBe(true);
	});

	it('parses owner-scoped story edits and preserves ShareDraft intent', () => {
		const parsed = parseUpdateStory({
			id: '07f332f3-aa2d-4233-ab1d-497463ce84e2',
			title: ' Private Cloudflare intelligence ',
			problem: 'Evidence was fragmented.',
			action: 'Built an isolated collector.',
			outcome: 'Shipped measurable operational evidence.',
			evidenceUrl: 'https://example.test/evidence',
			visibility: 'ShareDraft'
		});
		expect(Either.isRight(parsed)).toBe(true);
		if (Either.isRight(parsed)) {
			expect(parsed.right).toMatchObject({
				id: '07f332f3-aa2d-4233-ab1d-497463ce84e2',
				title: 'Private Cloudflare intelligence',
				visibility: 'ShareDraft'
			});
		}
		expect(
			Either.isLeft(
				parseUpdateStory({
					id: 'not-a-uuid',
					title: 'Story',
					problem: 'Problem',
					action: 'Action',
					outcome: 'Outcome',
					evidenceUrl: '',
					visibility: 'Private'
				})
			)
		).toBe(true);
	});

	it('derives overdue accountability and grouped pipeline evidence', () => {
		const summary = summarizeCareer([opportunity], [commitment], [], '2026-08-14');
		expect(summary).toMatchObject({
			activeOpportunities: 1,
			overdueActions: 1,
			openCommitments: 1
		});
		const view = createCareerAccountabilityView(
			{ opportunities: [opportunity], commitments: [commitment], stories: [], summary },
			'2026-08-14'
		);
		expect(view.columns.find((column) => column.stage === 'Applied')?.opportunities).toHaveLength(
			1
		);
		expect(view.followUpReminders[0]).toMatchObject({
			company: 'Acme',
			label: '1d overdue',
			tone: 'overdue'
		});
		expect(view.overdueFollowUps).toBe(1);
	});

	it('reprojects rail urgency against the viewer-local date', () => {
		const summary = summarizeCareer([opportunity], [], [], '2026-08-13');
		const snapshot = { opportunities: [opportunity], commitments: [], stories: [], summary };
		expect(createCareerNavigationSignal(snapshot, '2026-08-13').tone).toBe('neutral');
		expect(createCareerNavigationSignal(snapshot, '2026-08-14').tone).toBe('attention');
	});

	it('derives daily reminder urgency and excludes closed opportunities', () => {
		const opportunities: ReadonlyArray<CareerOpportunity> = [
			{ ...opportunity, id: '77960ef8-f702-4b4f-a220-d81f39e2393b', nextActionDue: '2026-08-14' },
			{ ...opportunity, id: '337832de-38b0-4ad9-954c-0f3b29a175d7', nextActionDue: '2026-08-15' },
			{ ...opportunity, id: '9c9a6f7a-a9a0-402f-b049-f9dc385c8100', nextActionDue: null },
			{
				...opportunity,
				id: 'e67ce570-06bd-4402-8e4b-7bd1441b9151',
				stage: 'Closed',
				nextActionDue: '2026-08-12'
			}
		];
		const summary = summarizeCareer(opportunities, [], [], '2026-08-14');
		const view = createCareerAccountabilityView(
			{ opportunities, commitments: [], stories: [], summary },
			'2026-08-14'
		);
		expect(view.overdueFollowUps).toBe(0);
		expect(view.followUpReminders.map(({ label, tone }) => ({ label, tone }))).toEqual([
			{ label: 'Due today', tone: 'today' },
			{ label: 'Due tomorrow', tone: 'upcoming' },
			{ label: 'Needs date', tone: 'unscheduled' }
		]);
	});
});
