import { describe, expect, it } from 'vitest';
import { decideRefreshLease, releaseRefreshLease } from './refresh-lease';

const TOKEN_A = '11111111-1111-4111-8111-111111111111';
const TOKEN_B = '22222222-2222-4222-8222-222222222222';

describe('refresh lease transitions', () => {
	it('acquires an empty lease for the requested duration', () => {
		const result = decideRefreshLease(null, 1_000, 60_000, TOKEN_A);
		expect(result).toEqual({
			decision: { _tag: 'Acquired', token: TOKEN_A, expiresAt: 61_000 },
			next: { token: TOKEN_A, expiresAt: 61_000 }
		});
	});

	it('keeps an active lease and reports the bounded retry interval', () => {
		const current = { token: TOKEN_A, expiresAt: 50_000 };
		const result = decideRefreshLease(current, 10_000, 60_000, TOKEN_B);
		expect(result).toEqual({
			decision: { _tag: 'Busy', retryAfterMs: 40_000 },
			next: current
		});
	});

	it('replaces an expired lease', () => {
		const result = decideRefreshLease(
			{ token: TOKEN_A, expiresAt: 10_000 },
			10_000,
			60_000,
			TOKEN_B
		);
		expect(result.decision).toEqual({
			_tag: 'Acquired',
			token: TOKEN_B,
			expiresAt: 70_000
		});
	});

	it('only releases the current holder token', () => {
		const current = { token: TOKEN_A, expiresAt: 50_000 };
		expect(releaseRefreshLease(current, TOKEN_B)).toBe(current);
		expect(releaseRefreshLease(current, TOKEN_A)).toBeNull();
	});
});
