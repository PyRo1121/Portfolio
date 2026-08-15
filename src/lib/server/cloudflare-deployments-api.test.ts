import { describe, expect, it } from 'vitest';
import { loadCloudflareDeploymentSnapshot } from './cloudflare-deployments-api';

function api(result: unknown): Response {
	return Response.json({ success: true, errors: [], messages: [], result });
}

describe('loadCloudflareDeploymentSnapshot', () => {
	it('retains exact deployment, version annotation, and build linkage', async () => {
		const fetch: typeof globalThis.fetch = async (input) => {
			const url = URL.parse(input instanceof Request ? input.url : input.toString());
			if (url === null) return new Response(null, { status: 400 });
			if (url.pathname.endsWith('/workers/scripts/weeknote/deployments')) {
				return api({
					deployments: [
						{
							id: 'deployment-id',
							source: 'wrangler',
							strategy: 'percentage',
							author_email: 'owner@example.com',
							annotations: {
								'workers/message': 'git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
								'workers/triggered_by': 'deployment'
							},
							versions: [{ version_id: 'version-id', percentage: 100 }],
							created_on: '2026-08-15T08:40:22.000Z'
						}
					]
				});
			}
			if (url.pathname.endsWith('/workers/scripts/weeknote/versions/version-id')) {
				return api({
					id: 'version-id',
					number: 33,
					metadata: {
						created_on: '2026-08-15T08:40:21.000Z',
						source: 'wrangler',
						author_email: 'owner@example.com'
					},
					annotations: {
						'workers/message': 'git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						'workers/tag': 'git-aaaaaaaaaaaa'
					},
					resources: { script: { last_deployed_from: 'wrangler' } }
				});
			}
			if (url.pathname.endsWith('/builds/builds')) {
				return api({
					builds: [
						{
							build_uuid: 'build-id',
							status: 'success',
							build_outcome: 'success',
							created_on: '2026-08-15T08:38:00.000Z',
							stopped_on: '2026-08-15T08:40:00.000Z',
							build_trigger_metadata: {
								branch: 'main',
								commit_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
							}
						}
					]
				});
			}
			return new Response(null, { status: 404 });
		};

		const snapshot = await loadCloudflareDeploymentSnapshot(
			fetch,
			'account-id',
			'token',
			['weeknote'],
			new Date('2026-08-15T09:00:00.000Z')
		);

		expect(snapshot.workers[0]).toMatchObject({
			workerName: 'weeknote',
			state: 'Observed',
			deploymentId: 'deployment-id',
			message: 'git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			versions: [
				{
					versionId: 'version-id',
					percentage: 100,
					tag: 'git-aaaaaaaaaaaa',
					build: {
						state: 'Observed',
						buildId: 'build-id',
						commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
					}
				}
			]
		});
	});

	it('separates a readable version with no build from an unavailable deployment endpoint', async () => {
		const fetch: typeof globalThis.fetch = async (input) => {
			const url = URL.parse(input instanceof Request ? input.url : input.toString());
			if (url?.pathname.endsWith('/workers/scripts/missing/deployments')) {
				return new Response(null, { status: 403 });
			}
			if (url?.pathname.endsWith('/workers/scripts/weeknote/deployments')) {
				return api({
					deployments: [
						{
							id: 'deployment-id',
							source: 'wrangler',
							strategy: 'percentage',
							versions: [{ version_id: 'version-id', percentage: 100 }],
							created_on: '2026-08-15T08:40:22.000Z'
						}
					]
				});
			}
			if (url?.pathname.endsWith('/workers/scripts/weeknote/versions/version-id')) {
				return api({ id: 'version-id' });
			}
			if (url?.pathname.endsWith('/builds/builds')) return api({ builds: [] });
			return new Response(null, { status: 404 });
		};

		const snapshot = await loadCloudflareDeploymentSnapshot(
			fetch,
			'account-id',
			'token',
			['weeknote', 'missing'],
			new Date('2026-08-15T09:00:00.000Z')
		);

		expect(
			snapshot.workers.find((worker) => worker.workerName === 'weeknote')?.versions[0]?.build
		).toMatchObject({ state: 'NoRecord', buildId: null });
		expect(snapshot.workers.find((worker) => worker.workerName === 'missing')).toMatchObject({
			state: 'Unavailable',
			deploymentId: null
		});
	});
});
