import { describe, expect, it } from 'vitest';
import type { CareerSnapshot } from './career-accountability';
import { createCareerAccountabilityReview } from './career-review';
import type { CloudflareUsageSnapshot } from './cloudflare-usage';
import { createDemoIntelligence, type GitHubDashboardSnapshot } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-14T12:00:00.000Z'), 'octocat', 'test')
);
const career: CareerSnapshot = {
	opportunities: [
		{
			id: '22ba8ef8-33cf-4c6b-bbce-474b39533fb7',
			company: 'Acme',
			role: 'Product engineer',
			jobUrl: 'https://example.test/role',
			stage: 'Applied',
			nextAction: 'Send founder follow-up',
			nextActionDue: '2026-08-13',
			contact: null,
			resumeVersion: 'startup-v2',
			notes: null,
			createdAt: '2026-08-10T00:00:00.000Z',
			updatedAt: '2026-08-10T00:00:00.000Z'
		}
	],
	commitments: [
		{
			id: '4fa48daa-7efb-4c20-9900-6f5c498d18dd',
			kind: 'Build',
			text: 'Publish one case study',
			dueOn: '2026-08-15',
			status: 'Open',
			createdAt: '2026-08-10T00:00:00.000Z',
			updatedAt: '2026-08-10T00:00:00.000Z'
		},
		{
			id: '77f85b4d-bd1d-41f6-9515-05b27b80a852',
			kind: 'Career',
			text: 'Shortlist three product teams',
			dueOn: '2026-08-14',
			status: 'Open',
			createdAt: '2026-08-10T00:00:00.000Z',
			updatedAt: '2026-08-10T00:00:00.000Z'
		}
	],
	stories: [
		{
			id: '07f332f3-aa2d-4233-ab1d-497463ce84e2',
			title: 'Private signal projection',
			problem: 'Evidence was fragmented.',
			action: 'Built a private review.',
			outcome: 'Connected delivery to career action.',
			evidence: {
				_tag: 'Observed',
				source: 'GitHub',
				kind: 'PullRequest',
				title: 'Private signal projection',
				repository: 'octocat/signal-garden',
				url: 'https://example.test/evidence',
				occurredAt: '2026-08-10T00:00:00.000Z',
				observedAt: '2026-08-10T00:00:00.000Z'
			},
			visibility: 'Private',
			createdAt: '2026-08-10T00:00:00.000Z',
			updatedAt: '2026-08-10T00:00:00.000Z'
		}
	],
	summary: {
		activeOpportunities: 1,
		interviewing: 0,
		overdueActions: 1,
		openCommitments: 2,
		storyDrafts: 1
	}
};
const cloudflare: CloudflareUsageSnapshot = {
	generatedAt: '2026-08-14T12:00:00.000Z',
	period: {
		startIso: '2026-08-08T00:00:00.000Z',
		endIso: '2026-08-14T12:00:00.000Z',
		label: 'Rolling seven days'
	},
	resources: [],
	products: [
		{
			id: 'd1',
			label: 'D1',
			count: 10,
			state: 'Provisioned',
			detail: 'Inventory',
			evidenceUrl: 'https://dash.cloudflare.com/d1'
		}
	],
	metrics: [
		{
			id: 'workerRequests',
			label: 'Worker requests',
			value: 2510,
			unit: 'requests',
			state: 'Measured',
			detail: 'Account-level analytics',
			evidenceUrl: 'https://dash.cloudflare.com/workers'
		}
	],
	summary: {
		availableProducts: 1,
		totalProducts: 1,
		provisionedResources: 10,
		measuredMetrics: 1,
		unavailableMetrics: 0
	}
};

function withSuccessfulWorkflow(base: GitHubDashboardSnapshot): GitHubDashboardSnapshot {
	const repository = base.intelligence.delivery.artifacts[0]?.repository ?? 'octocat/signal-garden';
	return {
		...base,
		intelligence: {
			...base.intelligence,
			delivery: {
				...base.intelligence.delivery,
				workflows: {
					...base.intelligence.delivery.workflows,
					current: {
						...base.intelligence.delivery.workflows.current,
						recent: [
							{
								id: 42,
								name: 'CI',
								title: 'Verify private signal projection',
								repository,
								url: 'https://github.com/octocat/signal-garden/actions/runs/42',
								event: 'push',
								status: 'completed',
								conclusion: 'success',
								branch: 'main',
								createdAt: '2026-08-14T10:00:00.000Z'
							}
						]
					}
				}
			}
		}
	};
}

describe('career accountability review', () => {
	it('connects one observed outcome to commitments and due follow-ups', () => {
		const review = createCareerAccountabilityReview(snapshot, career, null, '2026-08-14');
		expect(review.outcome).toMatchObject({
			state: 'Observed',
			repository: 'octocat/signal-garden',
			verification: { state: 'Unavailable' }
		});
		expect(review.outcome.headline).not.toMatch(/^I\s/);
		expect(review.buildCommitment).toMatchObject({
			state: 'Observed',
			text: 'Publish one case study',
			dueLabel: 'Due tomorrow'
		});
		expect(review.careerCommitment.dueLabel).toBe('Due today');
		expect(review.followUpWarnings[0]).toMatchObject({ company: 'Acme', tone: 'overdue' });
	});

	it('keeps account-level platform evidence separate from outcome verification', () => {
		const review = createCareerAccountabilityReview(
			withSuccessfulWorkflow(snapshot),
			career,
			cloudflare,
			'2026-08-14'
		);
		expect(review.outcome.verification).toMatchObject({ state: 'Observed' });
		expect(review.coverage.find((lane) => lane.id === 'operations')).toMatchObject({
			state: 'Measured'
		});
		expect(review.coverage.find((lane) => lane.id === 'data')).toMatchObject({
			state: 'Provisioned'
		});
		expect(review.boundaryNote).toContain('outcome-to-deployment linkage');
		expect(review.boundaryNote).toContain('not attributed');
	});

	it('does not promote commits into an outcome when delivery artifacts are absent', () => {
		const withoutOutcomes: GitHubDashboardSnapshot = {
			...snapshot,
			intelligence: {
				...snapshot.intelligence,
				delivery: { ...snapshot.intelligence.delivery, artifacts: [] }
			}
		};
		const review = createCareerAccountabilityReview(
			withoutOutcomes,
			career,
			cloudflare,
			'2026-08-14'
		);
		expect(review.outcome).toMatchObject({ state: 'Unavailable', evidence: null });
		expect(review.boundaryNote).toContain('Commit activity is not treated as an outcome');
	});
});
