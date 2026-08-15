import { describe, expect, it } from 'vitest';
import { ownerProjectResourceFromRow } from './owner-project-store';

describe('owner project D1 row mapping', () => {
	it('preserves the exact provider identity and evidence link', () => {
		expect(
			ownerProjectResourceFromRow({
				id: 'ba31b02d-424e-4e4d-8112-d15f79e2cb3e',
				project_id: 'd53e32ac-34fc-4c14-a7a4-279d90426f4d',
				kind: 'D1Database',
				environment: 'Production',
				provider_id: '2e37016a-ccb2-4a3d-b4fd-7010c7addf54',
				display_name: 'weeknote-career',
				canonical_url:
					'https://dash.cloudflare.com/example/workers/d1/2e37016a-ccb2-4a3d-b4fd-7010c7addf54',
				created_at: '2026-08-15T08:00:00.000Z'
			})
		).toEqual({
			id: 'ba31b02d-424e-4e4d-8112-d15f79e2cb3e',
			kind: 'D1Database',
			environment: 'Production',
			providerId: '2e37016a-ccb2-4a3d-b4fd-7010c7addf54',
			displayName: 'weeknote-career',
			canonicalUrl:
				'https://dash.cloudflare.com/example/workers/d1/2e37016a-ccb2-4a3d-b4fd-7010c7addf54',
			createdAt: '2026-08-15T08:00:00.000Z'
		});
	});
});
