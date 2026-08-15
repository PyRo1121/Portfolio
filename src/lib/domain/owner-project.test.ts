import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
	parseAddOwnerProjectResource,
	parseCreateOwnerProject,
	parseRemoveOwnerProjectResource
} from './owner-project';

describe('owner project form parsing', () => {
	it('parses a complete owner project without inventing optional fields', () => {
		const result = parseCreateOwnerProject({
			slug: 'weeknote',
			name: 'Weeknote',
			description: 'Private engineering evidence console.',
			lifecycle: 'Active'
		});

		expect(Either.isRight(result)).toBe(true);
		if (Either.isRight(result)) {
			expect(result.right).toEqual({
				slug: 'weeknote',
				name: 'Weeknote',
				description: 'Private engineering evidence console.',
				lifecycle: 'Active'
			});
		}
	});

	it('rejects a slug that cannot be used as a stable project key', () => {
		const result = parseCreateOwnerProject({
			slug: 'Week Note',
			name: 'Weeknote',
			description: 'Private engineering evidence console.',
			lifecycle: 'Active'
		});

		expect(Either.isLeft(result)).toBe(true);
	});

	it('normalizes an exact provider link while preserving its provider identifier', () => {
		const result = parseAddOwnerProjectResource({
			projectId: 'd53e32ac-34fc-4c14-a7a4-279d90426f4d',
			kind: 'CloudflareWorker',
			environment: 'Production',
			providerId: 'weeknote',
			displayName: 'weeknote',
			canonicalUrl: 'https://dash.cloudflare.com/example/workers/services/view/weeknote'
		});

		expect(Either.isRight(result)).toBe(true);
		if (Either.isRight(result)) {
			expect(result.right.providerId).toBe('weeknote');
			expect(result.right.canonicalUrl).toBe(
				'https://dash.cloudflare.com/example/workers/services/view/weeknote'
			);
		}
	});

	it('rejects non-HTTP resource links and malformed removal identifiers', () => {
		expect(
			Either.isLeft(
				parseAddOwnerProjectResource({
					projectId: 'd53e32ac-34fc-4c14-a7a4-279d90426f4d',
					kind: 'KVNamespace',
					environment: 'Production',
					providerId: 'namespace',
					displayName: 'Cache',
					canonicalUrl: 'javascript:alert(1)'
				})
			)
		).toBe(true);
		expect(Either.isLeft(parseRemoveOwnerProjectResource({ id: 'not-a-uuid' }))).toBe(true);
	});
});
