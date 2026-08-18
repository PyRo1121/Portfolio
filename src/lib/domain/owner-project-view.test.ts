import { describe, expect, it } from 'vitest';
import type { CloudflareDeploymentSnapshot } from './cloudflare-deployments';
import type { CloudflareUsageSnapshot } from './cloudflare-usage';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import type { OwnerProjectSnapshot } from './owner-project';
import { createOwnerProjectDossiers, createPublicShippingProjection } from './owner-project-view';

const registry: OwnerProjectSnapshot = {
	projects: [
		{
			id: 'd53e32ac-34fc-4c14-a7a4-279d90426f4d',
			slug: 'signal-garden',
			name: 'Signal Garden',
			description: 'Verified test project.',
			lifecycle: 'Active',
			createdAt: '2026-08-15T00:00:00.000Z',
			updatedAt: '2026-08-15T00:00:00.000Z',
			resources: [
				{
					id: '808c0741-4784-4991-b6d6-42504c857f86',
					kind: 'GitHubRepository',
					environment: 'Production',
					providerId: 'octocat/signal-garden',
					displayName: 'octocat/signal-garden',
					canonicalUrl: 'https://github.com/octocat/signal-garden',
					createdAt: '2026-08-15T00:00:00.000Z'
				},
				{
					id: '5c0be8fa-495f-44ff-8679-839fe479d3a5',
					kind: 'CloudflareWorker',
					environment: 'Production',
					providerId: 'signal-garden',
					displayName: 'signal-garden',
					canonicalUrl: 'https://dash.cloudflare.com/example/workers/signal-garden',
					createdAt: '2026-08-15T00:00:00.000Z'
				}
			]
		}
	]
};

function cloudflare(resources: CloudflareUsageSnapshot['resources']): CloudflareUsageSnapshot {
	return {
		generatedAt: '2026-08-15T00:00:00.000Z',
		period: {
			startIso: '2026-08-08T00:00:00.000Z',
			endIso: '2026-08-15T00:00:00.000Z',
			label: 'Last 7 UTC days'
		},
		products: [],
		resources,
		metrics: [],
		summary: {
			availableProducts: 0,
			totalProducts: 0,
			provisionedResources: resources.length,
			measuredMetrics: 0,
			unavailableMetrics: 0
		}
	};
}

describe('owner project dossier', () => {
	it('joins only exact provider identities from authenticated inventories', () => {
		const snapshot = createDemoIntelligence(
			createDemoSnapshot(new Date('2026-08-15T00:00:00.000Z'), 'octocat', 'Test fixture.')
		);
		const dossiers = createOwnerProjectDossiers(
			registry,
			snapshot,
			cloudflare([
				{
					kind: 'Worker',
					providerId: 'signal-garden',
					name: 'signal-garden',
					state: 'Provisioned',
					createdAt: '2026-08-01T00:00:00.000Z',
					modifiedAt: '2026-08-14T00:00:00.000Z',
					sizeBytes: null,
					evidenceUrl: 'https://dash.cloudflare.com/example/workers/signal-garden'
				}
			])
		);

		expect(dossiers[0]).toMatchObject({
			repositoryState: 'Observed',
			repository: { fullName: 'octocat/signal-garden' }
		});
		expect(dossiers[0]?.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					resource: expect.objectContaining({ kind: 'CloudflareWorker' }),
					state: 'Provisioned',
					cloudflare: expect.objectContaining({ modifiedAt: '2026-08-14T00:00:00.000Z' })
				})
			])
		);
	});

	it('keeps a missing provider resource unavailable instead of trusting its name', () => {
		const snapshot = createDemoIntelligence(
			createDemoSnapshot(new Date('2026-08-15T00:00:00.000Z'), 'octocat', 'Test fixture.')
		);
		const dossier = createOwnerProjectDossiers(registry, snapshot, cloudflare([]))[0];
		const worker = dossier?.resources.find(
			(resource) => resource.resource.kind === 'CloudflareWorker'
		);

		expect(worker).toMatchObject({
			state: 'Unavailable',
			detail: 'No matching resource exists in the current Cloudflare inventory.'
		});
	});

	it('links a deployment only when each exact provider record names the same commit', () => {
		const commitSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		const base = createDemoIntelligence(
			createDemoSnapshot(new Date('2026-08-15T00:00:00.000Z'), 'octocat', 'Test fixture.')
		);
		const repository = base.intelligence.repositories.find(
			(item) => item.fullName === 'octocat/signal-garden'
		);
		expect(repository).toBeDefined();
		const snapshot = {
			...base,
			intelligence: {
				...base.intelligence,
				commits: [
					...base.intelligence.commits,
					{
						sha: commitSha,
						shortSha: commitSha.slice(0, 7),
						message: 'Deploy exact project evidence',
						committedAt: '2026-08-15T08:30:00.000Z',
						repository: 'octocat/signal-garden',
						repositoryUrl: 'https://github.com/octocat/signal-garden',
						url: `https://github.com/octocat/signal-garden/commit/${commitSha}`,
						isPrivate: true,
						additions: 12,
						deletions: 2,
						changedFiles: 2
					}
				],
				delivery: {
					...base.intelligence.delivery,
					pullRequestMerges: [
						{
							title: 'Deploy exact project evidence',
							number: 12,
							repository: 'octocat/signal-garden',
							url: 'https://github.com/octocat/signal-garden/pull/12',
							mergeCommitSha: commitSha
						}
					],
					artifacts: [
						...base.intelligence.delivery.artifacts,
						{
							kind: 'PullRequest' as const,
							title: 'Deploy exact project evidence',
							repository: 'octocat/signal-garden',
							url: 'https://github.com/octocat/signal-garden/pull/12',
							occurredAt: '2026-08-15T08:30:00.000Z',
							status: 'shipped' as const,
							commitSha,
							detail: 'PR #12'
						}
					],
					workflows: {
						...base.intelligence.delivery.workflows,
						current: {
							...base.intelligence.delivery.workflows.current,
							recent: [
								{
									id: 12,
									name: 'Weeknote CI',
									title: 'Verify exact project evidence',
									repository: 'octocat/signal-garden',
									url: 'https://github.com/octocat/signal-garden/actions/runs/12',
									event: 'push',
									status: 'completed',
									conclusion: 'success',
									branch: 'main',
									headSha: commitSha,
									createdAt: '2026-08-15T08:31:00.000Z'
								}
							]
						}
					}
				}
			}
		};
		const deploymentSnapshot: CloudflareDeploymentSnapshot = {
			generatedAt: '2026-08-15T09:00:00.000Z',
			workers: [
				{
					workerName: 'signal-garden',
					state: 'Observed',
					detail: 'Observed',
					deploymentId: 'deployment-id',
					createdAt: '2026-08-15T08:40:22.000Z',
					source: 'wrangler',
					strategy: 'percentage',
					authorEmail: 'owner@example.com',
					message: `git:${commitSha}`,
					triggeredBy: 'deployment',
					versionsTruncated: false,
					evidenceUrl: 'https://dash.cloudflare.com/example/deployments',
					versions: [
						{
							versionId: 'version-id',
							percentage: 100,
							number: 12,
							createdAt: '2026-08-15T08:40:21.000Z',
							source: 'wrangler',
							authorEmail: 'owner@example.com',
							tag: 'git-aaaaaaaaaaaa',
							message: `git:${commitSha}`,
							lastDeployedFrom: 'wrangler',
							build: {
								state: 'Observed',
								detail: 'Observed',
								buildId: 'build-id',
								status: 'success',
								outcome: 'success',
								branch: 'main',
								commitSha,
								createdAt: '2026-08-15T08:35:00.000Z',
								completedAt: '2026-08-15T08:40:00.000Z'
							}
						}
					]
				}
			]
		};

		const dossier = createOwnerProjectDossiers(
			registry,
			snapshot,
			cloudflare([]),
			deploymentSnapshot
		)[0];
		expect(dossier?.deployments[0]).toMatchObject({
			state: 'Linked',
			commitSha,
			commit: { sha: commitSha },
			workflowRun: { id: 12 },
			pullRequest: { url: 'https://github.com/octocat/signal-garden/pull/12' },
			activeVersion: { versionId: 'version-id', build: { buildId: 'build-id' } }
		});
	});
});

describe('public shipping projection', () => {
	it('keeps confirmed GitHub, Worker, and domain links and omits D1/KV/R2', () => {
		const snapshot = createDemoIntelligence(
			createDemoSnapshot(new Date('2026-08-15T00:00:00.000Z'), 'octocat', 'Test fixture.')
		);
		const project = registry.projects[0];
		if (project === undefined) {
			throw new Error('Expected the shipping fixture to include one project.');
		}
		const withInventory: OwnerProjectSnapshot = {
			projects: [
				{
					...project,
					resources: [
						...project.resources,
						{
							id: 'd1-id',
							kind: 'D1Database',
							environment: 'Production',
							providerId: 'career-db',
							displayName: 'career-db',
							canonicalUrl: 'https://dash.cloudflare.com/example/d1',
							createdAt: '2026-08-15T00:00:00.000Z'
						}
					]
				}
			]
		};
		const projection = createPublicShippingProjection(withInventory, snapshot, null, {
			_tag: 'Current',
			reason: 'Public shipping links.'
		});
		const serialized = JSON.stringify(projection);
		expect(serialized).not.toContain('D1Database');
		expect(serialized).not.toContain('KVNamespace');
		expect(serialized).not.toContain('R2Bucket');
		expect(serialized).not.toContain('sizeBytes');
		expect(serialized).not.toContain('authorEmail');
		expect(serialized).not.toContain('triggeredBy');
		expect(projection.projects[0]?.links.map((link) => link.kind)).toEqual([
			'GitHubRepository',
			'CloudflareWorker'
		]);
		expect(
			projection.projects[0]?.links.find((link) => link.kind === 'CloudflareWorker')?.href
		).toBe(null);
	});

	it('strips operator identity from public deployment join facts', () => {
		const commitSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		const base = createDemoIntelligence(
			createDemoSnapshot(new Date('2026-08-15T00:00:00.000Z'), 'octocat', 'Test fixture.')
		);
		const deploymentSnapshot: CloudflareDeploymentSnapshot = {
			generatedAt: '2026-08-15T09:00:00.000Z',
			workers: [
				{
					workerName: 'signal-garden',
					state: 'Observed',
					detail: 'Observed',
					deploymentId: 'deployment-id',
					createdAt: '2026-08-15T08:40:22.000Z',
					source: 'wrangler',
					strategy: 'percentage',
					authorEmail: 'owner@example.com',
					message: `git:${commitSha}`,
					triggeredBy: 'deployment',
					versionsTruncated: false,
					evidenceUrl: 'https://dash.cloudflare.com/acct/deployments',
					versions: []
				}
			]
		};
		const projection = createPublicShippingProjection(registry, base, deploymentSnapshot, {
			_tag: 'Current',
			reason: 'Public shipping links.'
		});
		const serialized = JSON.stringify(projection);
		expect(serialized).not.toContain('owner@example.com');
		expect(serialized).not.toContain('dash.cloudflare.com');
		expect(projection.projects[0]?.deployments[0]?.commitSha).toBe(commitSha);
	});
});
