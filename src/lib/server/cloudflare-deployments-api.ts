import { Effect, Either, Redacted, Schema } from 'effect';
import type {
	CloudflareBuildEvidence,
	CloudflareDeploymentSnapshot,
	CloudflareWorkerDeploymentEvidence,
	CloudflareWorkerVersionEvidence
} from '$lib/domain/cloudflare-deployments';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const REQUEST_TIMEOUT_MS = 10_000;
const WORKER_CONCURRENCY = 4;
const MAX_DEPLOYMENT_VERSIONS = 4;

type Fetch = typeof globalThis.fetch;

const ApiErrorSchema = Schema.Struct({ code: Schema.Number, message: Schema.String });
const ApiEnvelopeSchema = Schema.Struct({
	success: Schema.Boolean,
	result: Schema.Unknown,
	errors: Schema.optional(Schema.Array(ApiErrorSchema))
});
const DeploymentVersionSchema = Schema.Struct({
	version_id: Schema.String,
	percentage: Schema.Number
});
const DeploymentSchema = Schema.Struct({
	id: Schema.String,
	source: Schema.String,
	strategy: Schema.String,
	author_email: Schema.optional(Schema.String),
	annotations: Schema.optional(
		Schema.Struct({
			'workers/message': Schema.optional(Schema.String),
			'workers/triggered_by': Schema.optional(Schema.String)
		})
	),
	versions: Schema.Array(DeploymentVersionSchema),
	created_on: Schema.String
});
const DeploymentsResultSchema = Schema.Struct({ deployments: Schema.Array(DeploymentSchema) });
const VersionDetailSchema = Schema.Struct({
	id: Schema.String,
	number: Schema.optional(Schema.Number),
	metadata: Schema.optional(
		Schema.Struct({
			created_on: Schema.optional(Schema.String),
			source: Schema.optional(Schema.String),
			author_email: Schema.optional(Schema.String)
		})
	),
	annotations: Schema.optional(
		Schema.Struct({
			'workers/message': Schema.optional(Schema.String),
			'workers/tag': Schema.optional(Schema.String)
		})
	),
	resources: Schema.optional(
		Schema.Struct({
			script: Schema.optional(Schema.Struct({ last_deployed_from: Schema.optional(Schema.String) }))
		})
	)
});
const BuildSchema = Schema.Struct({
	build_uuid: Schema.String,
	status: Schema.optional(Schema.String),
	build_outcome: Schema.optional(Schema.String),
	created_on: Schema.optional(Schema.String),
	stopped_on: Schema.optional(Schema.String),
	build_trigger_metadata: Schema.optional(
		Schema.Struct({
			branch: Schema.optional(Schema.String),
			commit_hash: Schema.optional(Schema.String)
		})
	)
});
const BuildsResultSchema = Schema.Struct({ builds: Schema.Unknown });

type ApiEnvelope = Schema.Schema.Type<typeof ApiEnvelopeSchema>;
type Build = Schema.Schema.Type<typeof BuildSchema>;

class CloudflareDeploymentCollectionError extends Error {
	readonly _tag = 'CloudflareDeploymentCollectionError';

	constructor(
		readonly surface: string,
		readonly status: number | null,
		readonly sourceCause: unknown
	) {
		super(status === null ? `${surface} could not be read` : `${surface} returned HTTP ${status}`);
	}
}

function requestResult(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	path: string
): Effect.Effect<ApiEnvelope, CloudflareDeploymentCollectionError> {
	const requestPath = `/accounts/${encodeURIComponent(accountId)}${path}`;
	return Effect.tryPromise({
		try: () =>
			fetch(`${API_BASE}${requestPath}`, {
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${Redacted.value(token)}`
				},
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
			}),
		catch: (cause) => new CloudflareDeploymentCollectionError(path, null, cause)
	}).pipe(
		Effect.flatMap((response) =>
			response.ok
				? Effect.tryPromise({
						try: () => response.json(),
						catch: (cause) => new CloudflareDeploymentCollectionError(path, response.status, cause)
					})
				: Effect.fail(new CloudflareDeploymentCollectionError(path, response.status, null))
		),
		Effect.flatMap((raw) =>
			Schema.decodeUnknown(ApiEnvelopeSchema)(raw).pipe(
				Effect.mapError((cause) => new CloudflareDeploymentCollectionError(path, null, cause))
			)
		),
		Effect.flatMap((envelope) =>
			envelope.success
				? Effect.succeed(envelope)
				: Effect.fail(new CloudflareDeploymentCollectionError(path, null, envelope.errors ?? null))
		)
	);
}

function unavailableBuild(detail: string): CloudflareBuildEvidence {
	return {
		state: 'Unavailable',
		detail,
		buildId: null,
		status: null,
		outcome: null,
		branch: null,
		commitSha: null,
		createdAt: null,
		completedAt: null
	};
}

function buildRecords(raw: unknown): ReadonlyArray<Build> | null {
	if (Array.isArray(raw)) {
		const decoded = raw.map((entry) => Schema.decodeUnknownEither(BuildSchema)(entry));
		return decoded.some(Either.isLeft)
			? null
			: decoded.flatMap((entry) => (Either.isRight(entry) ? [entry.right] : []));
	}
	if (typeof raw !== 'object' || raw === null) return null;
	const values = Object.values(raw).flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
	const decoded = values.map((entry) => Schema.decodeUnknownEither(BuildSchema)(entry));
	return decoded.some(Either.isLeft)
		? null
		: decoded.flatMap((entry) => (Either.isRight(entry) ? [entry.right] : []));
}

async function collectBuild(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	versionId: string
): Promise<CloudflareBuildEvidence> {
	const path = `/builds/builds?version_ids=${encodeURIComponent(versionId)}`;
	const exit = await Effect.runPromiseExit(requestResult(fetch, token, accountId, path));
	if (exit._tag === 'Failure') {
		return unavailableBuild(
			'The Workers Builds endpoint is unavailable or requires a user-scoped Builds token.'
		);
	}
	const result = Schema.decodeUnknownEither(BuildsResultSchema)(exit.value.result);
	if (Either.isLeft(result))
		return unavailableBuild('Cloudflare returned an unrecognized build shape.');
	const builds = buildRecords(result.right.builds);
	if (builds === null) return unavailableBuild('Cloudflare returned an unrecognized build record.');
	const build = [...builds].sort((left, right) =>
		(right.created_on ?? '').localeCompare(left.created_on ?? '')
	)[0];
	if (build === undefined) {
		return {
			...unavailableBuild('No Cloudflare Build record is associated with this Worker version.'),
			state: 'NoRecord'
		};
	}
	return {
		state: 'Observed',
		detail: 'Matched through the immutable Worker version identifier.',
		buildId: build.build_uuid,
		status: build.status ?? null,
		outcome: build.build_outcome ?? null,
		branch: build.build_trigger_metadata?.branch ?? null,
		commitSha: build.build_trigger_metadata?.commit_hash ?? null,
		createdAt: build.created_on ?? null,
		completedAt: build.stopped_on ?? null
	};
}

async function collectVersion(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	workerName: string,
	version: Schema.Schema.Type<typeof DeploymentVersionSchema>
): Promise<CloudflareWorkerVersionEvidence> {
	const path = `/workers/scripts/${encodeURIComponent(workerName)}/versions/${encodeURIComponent(version.version_id)}`;
	const [detailExit, build] = await Promise.all([
		Effect.runPromiseExit(requestResult(fetch, token, accountId, path)),
		collectBuild(fetch, token, accountId, version.version_id)
	]);
	if (detailExit._tag === 'Failure') {
		return {
			versionId: version.version_id,
			percentage: version.percentage,
			number: null,
			createdAt: null,
			source: null,
			authorEmail: null,
			tag: null,
			message: null,
			lastDeployedFrom: null,
			build
		};
	}
	const detail = Schema.decodeUnknownEither(VersionDetailSchema)(detailExit.value.result);
	if (Either.isLeft(detail)) {
		return {
			versionId: version.version_id,
			percentage: version.percentage,
			number: null,
			createdAt: null,
			source: null,
			authorEmail: null,
			tag: null,
			message: null,
			lastDeployedFrom: null,
			build
		};
	}
	return {
		versionId: detail.right.id,
		percentage: version.percentage,
		number: detail.right.number ?? null,
		createdAt: detail.right.metadata?.created_on ?? null,
		source: detail.right.metadata?.source ?? null,
		authorEmail: detail.right.metadata?.author_email ?? null,
		tag: detail.right.annotations?.['workers/tag'] ?? null,
		message: detail.right.annotations?.['workers/message'] ?? null,
		lastDeployedFrom: detail.right.resources?.script?.last_deployed_from ?? null,
		build
	};
}

function unavailableWorker(
	accountId: string,
	workerName: string,
	detail: string
): CloudflareWorkerDeploymentEvidence {
	return {
		workerName,
		state: 'Unavailable',
		detail,
		deploymentId: null,
		createdAt: null,
		source: null,
		strategy: null,
		authorEmail: null,
		message: null,
		triggeredBy: null,
		versions: [],
		versionsTruncated: false,
		evidenceUrl: `https://dash.cloudflare.com/${accountId}/workers/services/view/${encodeURIComponent(workerName)}/production/deployments`
	};
}

async function collectWorkerDeployment(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	workerName: string
): Promise<CloudflareWorkerDeploymentEvidence> {
	const path = `/workers/scripts/${encodeURIComponent(workerName)}/deployments`;
	const exit = await Effect.runPromiseExit(requestResult(fetch, token, accountId, path));
	if (exit._tag === 'Failure') {
		return unavailableWorker(
			accountId,
			workerName,
			'The Worker deployments endpoint is unavailable or the token lacks permission.'
		);
	}
	const result = Schema.decodeUnknownEither(DeploymentsResultSchema)(exit.value.result);
	if (Either.isLeft(result)) {
		return unavailableWorker(
			accountId,
			workerName,
			'Cloudflare returned an unrecognized deployment shape.'
		);
	}
	const deployment = [...result.right.deployments].sort((left, right) =>
		right.created_on.localeCompare(left.created_on)
	)[0];
	if (deployment === undefined) {
		return unavailableWorker(accountId, workerName, 'No Worker deployment record was returned.');
	}
	const retainedVersions = deployment.versions.slice(0, MAX_DEPLOYMENT_VERSIONS);
	const versions = await Promise.all(
		retainedVersions.map((version) => collectVersion(fetch, token, accountId, workerName, version))
	);
	return {
		workerName,
		state: 'Observed',
		detail:
			deployment.versions.length > MAX_DEPLOYMENT_VERSIONS
				? `Current deployment observed; ${deployment.versions.length - MAX_DEPLOYMENT_VERSIONS} additional versions were not retained.`
				: 'Current deployment returned by the Worker deployments API.',
		deploymentId: deployment.id,
		createdAt: deployment.created_on,
		source: deployment.source,
		strategy: deployment.strategy,
		authorEmail: deployment.author_email ?? null,
		message: deployment.annotations?.['workers/message'] ?? null,
		triggeredBy: deployment.annotations?.['workers/triggered_by'] ?? null,
		versions,
		versionsTruncated: deployment.versions.length > MAX_DEPLOYMENT_VERSIONS,
		evidenceUrl: `https://dash.cloudflare.com/${accountId}/workers/services/view/${encodeURIComponent(workerName)}/production/deployments`
	};
}

/** Collect current deployment, immutable version, and exact build records for linked Workers. */
export async function loadCloudflareDeploymentSnapshot(
	fetch: Fetch,
	accountId: string,
	rawToken: string,
	workerNames: ReadonlyArray<string>,
	now: Date
): Promise<CloudflareDeploymentSnapshot> {
	const token = Redacted.make(rawToken);
	const names = [...new Set(workerNames.map((name) => name.trim()).filter(Boolean))].sort(
		(left, right) => left.localeCompare(right)
	);
	const workers: CloudflareWorkerDeploymentEvidence[] = [];
	for (let offset = 0; offset < names.length; offset += WORKER_CONCURRENCY) {
		workers.push(
			...(await Promise.all(
				names
					.slice(offset, offset + WORKER_CONCURRENCY)
					.map((name) => collectWorkerDeployment(fetch, token, accountId, name))
			))
		);
	}
	return { generatedAt: now.toISOString(), workers };
}
