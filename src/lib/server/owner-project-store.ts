import type { D1Database } from '@cloudflare/workers-types';
import { Effect, Schema } from 'effect';
import {
	OwnerProjectEnvironmentSchema,
	OwnerProjectLifecycleSchema,
	OwnerProjectResourceKindSchema,
	type AddOwnerProjectResourceInput,
	type CreateOwnerProjectInput,
	type OwnerProject,
	type OwnerProjectResource,
	type OwnerProjectResourceKind,
	type OwnerProjectSnapshot,
	type UpdateOwnerProjectInput
} from '$lib/domain/owner-project';

const ProjectRowSchema = Schema.Struct({
	id: Schema.String,
	slug: Schema.String,
	name: Schema.String,
	description: Schema.String,
	lifecycle: OwnerProjectLifecycleSchema,
	created_at: Schema.String,
	updated_at: Schema.String
});
const ResourceRowSchema = Schema.Struct({
	id: Schema.String,
	project_id: Schema.String,
	kind: OwnerProjectResourceKindSchema,
	environment: OwnerProjectEnvironmentSchema,
	provider_id: Schema.String,
	display_name: Schema.String,
	canonical_url: Schema.String,
	created_at: Schema.String
});

/** Expected missing owner-scoped project registry record. */
export class OwnerProjectRecordNotFound extends Error {
	readonly _tag = 'OwnerProjectRecordNotFound';

	constructor(
		readonly entity: 'project' | 'resource',
		readonly id: string
	) {
		super(`Owner project ${entity} ${id} was not found.`);
		this.name = 'OwnerProjectRecordNotFound';
	}
}

/** Typed owner-project persistence failure. */
export class OwnerProjectStoreError extends Error {
	readonly _tag = 'OwnerProjectStoreError';

	constructor(
		readonly operation: string,
		readonly sourceCause: unknown
	) {
		super(`Owner project storage failed during ${operation}.`);
	}
}

/** Convert one parsed D1 resource row into an owner project resource. */
export function ownerProjectResourceFromRow(
	row: Schema.Schema.Type<typeof ResourceRowSchema>
): OwnerProjectResource {
	return {
		id: row.id,
		kind: row.kind,
		environment: row.environment,
		providerId: row.provider_id,
		displayName: row.display_name,
		canonicalUrl: row.canonical_url,
		createdAt: row.created_at
	};
}

const OWNER_RESOURCE_KINDS: ReadonlyArray<OwnerProjectResourceKind> = [
	'GitHubRepository',
	'CloudflareWorker',
	'D1Database',
	'KVNamespace',
	'R2Bucket',
	'Domain'
];

/** Bound D1 query that excludes project metadata without a requested resource kind. */
export function ownerProjectQuery(
	ownerEmail: string,
	resourceKinds: ReadonlyArray<OwnerProjectResourceKind>
): { readonly sql: string; readonly binds: ReadonlyArray<string> } {
	const includesEveryKind =
		resourceKinds.length === OWNER_RESOURCE_KINDS.length &&
		OWNER_RESOURCE_KINDS.every((kind) => resourceKinds.includes(kind));
	if (includesEveryKind) {
		return {
			sql: `SELECT id, slug, name, description, lifecycle, created_at, updated_at
			      FROM owner_projects WHERE owner_email = ? ORDER BY updated_at DESC`,
			binds: [ownerEmail]
		};
	}
	const placeholders = resourceKinds.map(() => '?').join(', ');
	return {
		sql: `SELECT project.id, project.slug, project.name, project.description,
		             project.lifecycle, project.created_at, project.updated_at
		      FROM owner_projects AS project
		      WHERE project.owner_email = ?
		        AND EXISTS (
		          SELECT 1 FROM owner_project_resources AS resource
		          WHERE resource.owner_email = project.owner_email
		            AND resource.project_id = project.id
		            AND resource.kind IN (${placeholders})
		        )
		      ORDER BY project.updated_at DESC`,
		binds: [ownerEmail, ...resourceKinds]
	};
}

/** Bound D1 query that loads owner-project resources for the requested kinds. */
export function ownerProjectResourceQuery(
	ownerEmail: string,
	resourceKinds: ReadonlyArray<OwnerProjectResourceKind>
): { readonly sql: string; readonly binds: ReadonlyArray<string> } {
	const placeholders = resourceKinds.map(() => '?').join(', ');
	return {
		sql: `SELECT id, project_id, kind, environment, provider_id, display_name,
		             canonical_url, created_at
		      FROM owner_project_resources WHERE owner_email = ? AND kind IN (${placeholders})
		      ORDER BY kind ASC, display_name ASC`,
		binds: [ownerEmail, ...resourceKinds]
	};
}

/** Load the owner-scoped project registry from D1, optionally limited to shipping kinds. */
export function loadOwnerProjectSnapshot(
	database: D1Database,
	ownerEmail: string,
	resourceKinds: ReadonlyArray<OwnerProjectResourceKind> = OWNER_RESOURCE_KINDS
): Effect.Effect<OwnerProjectSnapshot, OwnerProjectStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const projectQuery = ownerProjectQuery(ownerEmail, resourceKinds);
			const resourceQuery = ownerProjectResourceQuery(ownerEmail, resourceKinds);
			const [projectResult, resourceResult] = await Promise.all([
				database
					.prepare(projectQuery.sql)
					.bind(...projectQuery.binds)
					.all(),
				database
					.prepare(resourceQuery.sql)
					.bind(...resourceQuery.binds)
					.all()
			]);
			const projectRows = Schema.decodeUnknownSync(Schema.Array(ProjectRowSchema))(
				projectResult.results
			);
			const resourceRows = Schema.decodeUnknownSync(Schema.Array(ResourceRowSchema))(
				resourceResult.results
			);
			const resourcesByProject = new Map<string, Array<OwnerProjectResource>>();
			for (const row of resourceRows) {
				const resources = resourcesByProject.get(row.project_id) ?? [];
				resources.push(ownerProjectResourceFromRow(row));
				resourcesByProject.set(row.project_id, resources);
			}
			const projects: ReadonlyArray<OwnerProject> = projectRows.map((row) => ({
				id: row.id,
				slug: row.slug,
				name: row.name,
				description: row.description,
				lifecycle: row.lifecycle,
				resources: resourcesByProject.get(row.id) ?? [],
				createdAt: row.created_at,
				updatedAt: row.updated_at
			}));
			return { projects };
		},
		catch: (cause) => new OwnerProjectStoreError('load', cause)
	});
}

/** Create one owner-scoped project. */
export function createOwnerProject(
	database: D1Database,
	ownerEmail: string,
	input: CreateOwnerProjectInput,
	now: Date
): Effect.Effect<void, OwnerProjectStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const timestamp = now.toISOString();
			await database
				.prepare(
					`INSERT INTO owner_projects
					 (id, owner_email, slug, name, description, lifecycle, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					crypto.randomUUID(),
					ownerEmail,
					input.slug,
					input.name,
					input.description,
					input.lifecycle,
					timestamp,
					timestamp
				)
				.run();
		},
		catch: (cause) => new OwnerProjectStoreError('create project', cause)
	});
}

/** Update owner-controlled metadata for one project. */
export function updateOwnerProject(
	database: D1Database,
	ownerEmail: string,
	input: UpdateOwnerProjectInput,
	now: Date
): Effect.Effect<void, OwnerProjectRecordNotFound | OwnerProjectStoreError> {
	return Effect.tryPromise({
		try: () =>
			database
				.prepare(
					`UPDATE owner_projects
					 SET slug = ?, name = ?, description = ?, lifecycle = ?, updated_at = ?
					 WHERE id = ? AND owner_email = ?`
				)
				.bind(
					input.slug,
					input.name,
					input.description,
					input.lifecycle,
					now.toISOString(),
					input.id,
					ownerEmail
				)
				.run(),
		catch: (cause) => new OwnerProjectStoreError('update project', cause)
	}).pipe(
		Effect.flatMap((result) =>
			result.meta.changes === 1
				? Effect.void
				: Effect.fail(new OwnerProjectRecordNotFound('project', input.id))
		)
	);
}

/** Add one owner-confirmed provider association to a project. */
export function addOwnerProjectResource(
	database: D1Database,
	ownerEmail: string,
	input: AddOwnerProjectResourceInput,
	now: Date
): Effect.Effect<void, OwnerProjectRecordNotFound | OwnerProjectStoreError> {
	return Effect.tryPromise({
		try: () =>
			database
				.prepare(
					`INSERT INTO owner_project_resources
					 (id, project_id, owner_email, kind, environment, provider_id, display_name,
					  canonical_url, created_at)
					 SELECT ?, id, ?, ?, ?, ?, ?, ?, ?
					 FROM owner_projects WHERE id = ? AND owner_email = ?`
				)
				.bind(
					crypto.randomUUID(),
					ownerEmail,
					input.kind,
					input.environment,
					input.providerId,
					input.displayName,
					input.canonicalUrl,
					now.toISOString(),
					input.projectId,
					ownerEmail
				)
				.run(),
		catch: (cause) => new OwnerProjectStoreError('add resource', cause)
	}).pipe(
		Effect.flatMap((result) =>
			result.meta.changes === 1
				? Effect.void
				: Effect.fail(new OwnerProjectRecordNotFound('project', input.projectId))
		)
	);
}

/** Remove one owner-scoped project resource association. */
export function removeOwnerProjectResource(
	database: D1Database,
	ownerEmail: string,
	resourceId: string
): Effect.Effect<void, OwnerProjectRecordNotFound | OwnerProjectStoreError> {
	return Effect.tryPromise({
		try: () =>
			database
				.prepare('DELETE FROM owner_project_resources WHERE id = ? AND owner_email = ?')
				.bind(resourceId, ownerEmail)
				.run(),
		catch: (cause) => new OwnerProjectStoreError('remove resource', cause)
	}).pipe(
		Effect.flatMap((result) =>
			result.meta.changes === 1
				? Effect.void
				: Effect.fail(new OwnerProjectRecordNotFound('resource', resourceId))
		)
	);
}
