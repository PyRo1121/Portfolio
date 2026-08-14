import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
	parseCreateOpportunity,
	summarizeCareer,
	type CareerCommitment,
	type CareerOpportunity
} from './career-accountability';
import { createCareerView } from './career-view';

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

	it('rejects non-HTTP job links', () => {
		const parsed = parseCreateOpportunity({
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
		expect(Either.isLeft(parsed)).toBe(true);
	});

	it('derives overdue accountability and grouped pipeline evidence', () => {
		const summary = summarizeCareer([opportunity], [commitment], [], '2026-08-14');
		expect(summary).toMatchObject({
			activeOpportunities: 1,
			overdueActions: 1,
			openCommitments: 1
		});
		const view = createCareerView(
			{ opportunities: [opportunity], commitments: [commitment], stories: [], summary },
			'2026-08-14'
		);
		expect(view.columns.find((column) => column.stage === 'Applied')?.opportunities).toHaveLength(
			1
		);
		expect(view.nextActions[0]?.overdue).toBe(true);
	});
});
