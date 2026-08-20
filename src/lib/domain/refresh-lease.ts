import { Schema } from 'effect';

const RefreshLeaseKeySchema = Schema.String.pipe(
	Schema.minLength(1),
	Schema.maxLength(128),
	Schema.pattern(/^[a-z0-9:._-]+$/u)
);
const RefreshLeaseTokenSchema = Schema.String.pipe(
	Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
);
const EpochMillisecondsSchema = Schema.Number.pipe(Schema.int(), Schema.nonNegative());
const LeaseDurationSchema = Schema.Number.pipe(Schema.int(), Schema.between(1_000, 300_000));

export const AcquireRefreshLeaseRequestSchema = Schema.Struct({
	key: RefreshLeaseKeySchema,
	ttlMs: LeaseDurationSchema
});
export type AcquireRefreshLeaseRequest = Schema.Schema.Type<
	typeof AcquireRefreshLeaseRequestSchema
>;

export const ReleaseRefreshLeaseRequestSchema = Schema.Struct({
	key: RefreshLeaseKeySchema,
	token: RefreshLeaseTokenSchema
});
export type ReleaseRefreshLeaseRequest = Schema.Schema.Type<
	typeof ReleaseRefreshLeaseRequestSchema
>;

export const RefreshLeaseDecisionSchema = Schema.Union(
	Schema.Struct({
		_tag: Schema.Literal('Acquired'),
		token: RefreshLeaseTokenSchema,
		expiresAt: EpochMillisecondsSchema
	}),
	Schema.Struct({
		_tag: Schema.Literal('Busy'),
		retryAfterMs: LeaseDurationSchema
	})
);
export type RefreshLeaseDecision = Schema.Schema.Type<typeof RefreshLeaseDecisionSchema>;

export type StoredRefreshLease = {
	readonly token: string;
	readonly expiresAt: number;
};

/** Decide one atomic lease acquisition from the Durable Object's current row. */
export function decideRefreshLease(
	current: StoredRefreshLease | null,
	nowMs: number,
	ttlMs: number,
	token: string
): { readonly decision: RefreshLeaseDecision; readonly next: StoredRefreshLease | null } {
	if (current !== null && current.expiresAt > nowMs) {
		return {
			decision: {
				_tag: 'Busy',
				retryAfterMs: Math.max(1_000, Math.min(300_000, current.expiresAt - nowMs))
			},
			next: current
		};
	}
	const next = { token, expiresAt: nowMs + ttlMs };
	return { decision: { _tag: 'Acquired', ...next }, next };
}

/** Only the holder that owns the token may release the lease. */
export function releaseRefreshLease(
	current: StoredRefreshLease | null,
	token: string
): StoredRefreshLease | null {
	return current?.token === token ? null : current;
}
