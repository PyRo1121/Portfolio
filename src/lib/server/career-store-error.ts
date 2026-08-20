/** Expected missing owner-scoped Career record. */
export class CareerRecordNotFound extends Error {
	readonly _tag = 'CareerRecordNotFound';

	constructor(
		readonly entity: 'commitment' | 'opportunity' | 'story',
		readonly id: string
	) {
		super(`Career ${entity} ${id} was not found.`);
		this.name = 'CareerRecordNotFound';
	}
}

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
