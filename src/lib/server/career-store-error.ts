/** Typed failure from an owner-scoped private Career D1 adapter. */
export class CareerStoreError extends Error {
	readonly _tag = 'CareerStoreError';

	constructor(
		readonly operation: string,
		readonly sourceCause: unknown
	) {
		super(`Career store failed during ${operation}`);
	}
}
