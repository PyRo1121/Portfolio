import { describe, expect, it } from 'vitest';
import { resolveOwnerAccess } from './owner-access';

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
