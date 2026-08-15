import { describe, expect, it } from 'vitest';
import type { CloudflareUsageSnapshot } from './cloudflare-usage';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import type { OwnerProjectSnapshot } from './owner-project';
import { createOwnerProjectDossiers } from './owner-project-view';

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
});
