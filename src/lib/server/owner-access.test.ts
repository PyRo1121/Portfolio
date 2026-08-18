import { describe, expect, it } from 'vitest';
import {
	configuredOwnerEmail,
	isOwnerMutationPath,
	rejectDeniedOwnerLoad,
	resolveOwnerAccess
} from './owner-access';

describe('configuredOwnerEmail', () => {
	it('normalizes a configured public-read identity', () => {
		expect(configuredOwnerEmail(' OLEN@LATHAM.CLOUD ')).toBe('olen@latham.cloud');
		expect(configuredOwnerEmail('  ')).toBeNull();
		expect(configuredOwnerEmail(undefined)).toBeNull();
	});
});

describe('isOwnerMutationPath', () => {
	it('accepts only the Access-protected owner route', () => {
		expect(isOwnerMutationPath('/owner')).toBe(true);
		expect(isOwnerMutationPath('/')).toBe(false);
		expect(isOwnerMutationPath('/career/portfolio.md')).toBe(false);
	});
});

describe('resolveOwnerAccess', () => {
	it('allows only the exact configured Access identity with an assertion', () => {
		const headers = new Headers({
			'cf-access-authenticated-user-email': 'OLEN@LATHAM.CLOUD',
			'cf-access-jwt-assertion': 'signed-access-assertion'
		});
		expect(resolveOwnerAccess(headers, 'olen@latham.cloud')).toEqual({
			_tag: 'Allowed',
			ownerEmail: 'olen@latham.cloud'
		});
	});

	it('denies spoofable email-only requests', () => {
		const headers = new Headers({
			'cf-access-authenticated-user-email': 'olen@latham.cloud'
		});
		expect(resolveOwnerAccess(headers, 'olen@latham.cloud')._tag).toBe('Denied');
	});

	it('denies every other Access identity', () => {
		const headers = new Headers({
			'cf-access-authenticated-user-email': 'other@example.com',
			'cf-access-jwt-assertion': 'signed-access-assertion'
		});
		expect(resolveOwnerAccess(headers, 'olen@latham.cloud')._tag).toBe('Denied');
	});
});

describe('rejectDeniedOwnerLoad', () => {
	it('throws HTTP 403 for a denied Access identity', () => {
		try {
			rejectDeniedOwnerLoad({
				_tag: 'Denied',
				reason: 'Owner data requires the configured Access identity.'
			});
			expect.fail('expected error(403)');
		} catch (cause) {
			expect(cause).toMatchObject({ status: 403 });
		}
	});
});
