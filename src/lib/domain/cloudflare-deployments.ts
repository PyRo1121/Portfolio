import { Schema } from 'effect';

export const CloudflareBuildEvidenceSchema = Schema.Struct({
	state: Schema.Union(
		Schema.Literal('Observed'),
		Schema.Literal('NoRecord'),
		Schema.Literal('Unavailable')
	),
	detail: Schema.String,
	buildId: Schema.NullOr(Schema.String),
	status: Schema.NullOr(Schema.String),
	outcome: Schema.NullOr(Schema.String),
	branch: Schema.NullOr(Schema.String),
	commitSha: Schema.NullOr(Schema.String),
	createdAt: Schema.NullOr(Schema.String),
	completedAt: Schema.NullOr(Schema.String)
});
export type CloudflareBuildEvidence = Schema.Schema.Type<typeof CloudflareBuildEvidenceSchema>;

export const CloudflareWorkerVersionEvidenceSchema = Schema.Struct({
	versionId: Schema.String,
	percentage: Schema.Number,
	number: Schema.NullOr(Schema.Number),
	createdAt: Schema.NullOr(Schema.String),
	source: Schema.NullOr(Schema.String),
	authorEmail: Schema.NullOr(Schema.String),
	tag: Schema.NullOr(Schema.String),
	message: Schema.NullOr(Schema.String),
	lastDeployedFrom: Schema.NullOr(Schema.String),
	build: CloudflareBuildEvidenceSchema
});
export type CloudflareWorkerVersionEvidence = Schema.Schema.Type<
	typeof CloudflareWorkerVersionEvidenceSchema
>;

export const CloudflareWorkerDeploymentEvidenceSchema = Schema.Struct({
	workerName: Schema.String,
	state: Schema.Union(Schema.Literal('Observed'), Schema.Literal('Unavailable')),
	detail: Schema.String,
	deploymentId: Schema.NullOr(Schema.String),
	createdAt: Schema.NullOr(Schema.String),
	source: Schema.NullOr(Schema.String),
	strategy: Schema.NullOr(Schema.String),
	authorEmail: Schema.NullOr(Schema.String),
	message: Schema.NullOr(Schema.String),
	triggeredBy: Schema.NullOr(Schema.String),
	versions: Schema.Array(CloudflareWorkerVersionEvidenceSchema),
	versionsTruncated: Schema.Boolean,
	evidenceUrl: Schema.String
});
export type CloudflareWorkerDeploymentEvidence = Schema.Schema.Type<
	typeof CloudflareWorkerDeploymentEvidenceSchema
>;

/** Independently cached deployment evidence for owner-linked Workers. */
export const CloudflareDeploymentSnapshotSchema = Schema.Struct({
	generatedAt: Schema.String,
	workers: Schema.Array(CloudflareWorkerDeploymentEvidenceSchema)
});
export type CloudflareDeploymentSnapshot = Schema.Schema.Type<
	typeof CloudflareDeploymentSnapshotSchema
>;

export type CloudflareDeploymentRefreshResult =
	| {
			readonly _tag: 'Fresh';
			readonly snapshot: CloudflareDeploymentSnapshot;
			readonly refreshedAt: string;
	  }
	| { readonly _tag: 'Current'; readonly checkedAt: string }
	| { readonly _tag: 'Deferred'; readonly deferredAt: string; readonly retryAfterMs: number }
	| { readonly _tag: 'Unavailable'; readonly attemptedAt: string; readonly reason: string };
