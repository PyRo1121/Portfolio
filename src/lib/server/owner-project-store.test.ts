import { describe, expect, it } from 'vitest';
import { Cause, Effect, Exit } from 'effect';
import type { D1Database } from '@cloudflare/workers-types';
import { PUBLIC_SHIPPING_RESOURCE_KINDS } from '$lib/domain/owner-project';
import {
	addOwnerProjectResource,
	OwnerProjectRecordNotFound,
	ownerProjectResourceFromRow,
	ownerProjectResourceQuery,
	ownerProjectQuery
} from './owner-project-store';

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

describe('owner project queries', () => {
	it('limits public project metadata to projects with a shipping resource', () => {
		const query = ownerProjectQuery('olen@latham.cloud', PUBLIC_SHIPPING_RESOURCE_KINDS);
		expect(query.sql).toContain('EXISTS');
		expect(query.sql).toContain('resource.kind IN (?, ?, ?)');
		expect(query.binds).toEqual([
			'olen@latham.cloud',
			'GitHubRepository',
			'CloudflareWorker',
			'Domain'
		]);
	});

	it('limits public shipping reads to GitHub, Worker, and domain kinds', () => {
		const query = ownerProjectResourceQuery('olen@latham.cloud', PUBLIC_SHIPPING_RESOURCE_KINDS);
		expect(query.sql).toContain('kind IN (?, ?, ?)');
		expect(query.binds).toEqual([
			'olen@latham.cloud',
			'GitHubRepository',
			'CloudflareWorker',
			'Domain'
		]);
		expect(query.binds).not.toContain('D1Database');
		expect(query.binds).not.toContain('KVNamespace');
		expect(query.binds).not.toContain('R2Bucket');
	});
});

describe('addOwnerProjectResource', () => {
	const input = {
		projectId: 'd53e32ac-34fc-4c14-a7a4-279d90426f4d',
		kind: 'GitHubRepository' as const,
		environment: 'Production' as const,
		providerId: 'PyRo1121/omg',
		displayName: 'omg',
		canonicalUrl: 'https://github.com/PyRo1121/omg'
	};

	function fakeDatabase(meta: { changes: number }) {
		return {
			prepare: () => ({
				bind: () => ({
					run: async () => ({ meta })
				})
			})
		} as unknown as D1Database;
	}

	it('fails with OwnerProjectRecordNotFound when the insert matches no row', async () => {
		const exit = await Effect.runPromiseExit(
			addOwnerProjectResource(fakeDatabase({ changes: 0 }), 'olen@latham.cloud', input, new Date())
		);
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.squash(exit.cause);
			expect(error).toBeInstanceOf(OwnerProjectRecordNotFound);
		}
	});
});
