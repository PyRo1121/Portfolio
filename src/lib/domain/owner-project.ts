import { Either, Schema } from 'effect';

/** Owner-set lifecycle state for one private project. */
export const OwnerProjectLifecycleSchema = Schema.Union(
	Schema.Literal('Active'),
	Schema.Literal('Paused'),
	Schema.Literal('Archived'),
	Schema.Literal('Reviewing')
);
export type OwnerProjectLifecycle = Schema.Schema.Type<typeof OwnerProjectLifecycleSchema>;

/** Resource types that can be associated with an owner project. */
export const OwnerProjectResourceKindSchema = Schema.Union(
	Schema.Literal('GitHubRepository'),
	Schema.Literal('CloudflareWorker'),
	Schema.Literal('D1Database'),
	Schema.Literal('KVNamespace'),
	Schema.Literal('R2Bucket'),
	Schema.Literal('Domain')
);
export type OwnerProjectResourceKind = Schema.Schema.Type<typeof OwnerProjectResourceKindSchema>;

/** Resource kinds allowed on public shipping-link reads. */
export const PUBLIC_SHIPPING_RESOURCE_KINDS = [
	'GitHubRepository',
	'CloudflareWorker',
	'Domain'
] as const satisfies ReadonlyArray<OwnerProjectResourceKind>;
export type PublicShippingResourceKind = (typeof PUBLIC_SHIPPING_RESOURCE_KINDS)[number];

/** Deployment environment assigned by the owner to a linked resource. */
export const OwnerProjectEnvironmentSchema = Schema.Union(
	Schema.Literal('Production'),
	Schema.Literal('Staging'),
	Schema.Literal('Development'),
	Schema.Literal('Shared')
);
export type OwnerProjectEnvironment = Schema.Schema.Type<typeof OwnerProjectEnvironmentSchema>;

/** One persisted provider resource associated with an owner project. */
export type OwnerProjectResource = {
	readonly id: string;
	readonly kind: OwnerProjectResourceKind;
	readonly environment: OwnerProjectEnvironment;
	readonly providerId: string;
	readonly displayName: string;
	readonly canonicalUrl: string;
	readonly createdAt: string;
};

/** One owner-scoped project and its confirmed provider associations. */
export type OwnerProject = {
	readonly id: string;
	readonly slug: string;
	readonly name: string;
	readonly description: string;
	readonly lifecycle: OwnerProjectLifecycle;
	readonly resources: ReadonlyArray<OwnerProjectResource>;
	readonly createdAt: string;
	readonly updatedAt: string;
};

/** Complete owner-scoped project registry. */
export type OwnerProjectSnapshot = {
	readonly projects: ReadonlyArray<OwnerProject>;
};

/** Parsed command for creating an owner project. */
export type CreateOwnerProjectInput = {
	readonly slug: string;
	readonly name: string;
	readonly description: string;
	readonly lifecycle: OwnerProjectLifecycle;
};

/** Parsed command for updating owner-controlled project metadata. */
export type UpdateOwnerProjectInput = CreateOwnerProjectInput & { readonly id: string };

/** Parsed command for associating a provider resource with one project. */
export type AddOwnerProjectResourceInput = {
	readonly projectId: string;
	readonly kind: OwnerProjectResourceKind;
	readonly environment: OwnerProjectEnvironment;
	readonly providerId: string;
	readonly displayName: string;
	readonly canonicalUrl: string;
};

/** Stable, user-safe project-registry form parsing failure. */
export class OwnerProjectInputError extends Error {
	readonly _tag = 'OwnerProjectInputError';

	constructor(readonly reason: string) {
		super(reason);
	}
}

const RequiredText = Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(180));
const DescriptionText = Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(1_000));
const ProviderId = Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(512));
const CanonicalUrl = Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(2_048));
const ProjectSlug = Schema.Trim.pipe(
	Schema.minLength(1),
	Schema.maxLength(64),
	Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
);
const ProjectFormSchema = Schema.Struct({
	slug: ProjectSlug,
	name: RequiredText,
	description: DescriptionText,
	lifecycle: OwnerProjectLifecycleSchema
});
const UpdateProjectFormSchema = Schema.Struct({ id: Schema.UUID, ...ProjectFormSchema.fields });
const ProjectResourceFormSchema = Schema.Struct({
	projectId: Schema.UUID,
	kind: OwnerProjectResourceKindSchema,
	environment: OwnerProjectEnvironmentSchema,
	providerId: ProviderId,
	displayName: RequiredText,
	canonicalUrl: CanonicalUrl
});
const ResourceIdFormSchema = Schema.Struct({ id: Schema.UUID });

function parseCanonicalUrl(value: string): Either.Either<string, OwnerProjectInputError> {
	const parsed = URL.parse(value);
	return parsed !== null && (parsed.protocol === 'https:' || parsed.protocol === 'http:')
		? Either.right(parsed.toString())
		: Either.left(new OwnerProjectInputError('Resource links must use a valid HTTP or HTTPS URL.'));
}

/** Parse an untrusted project-creation form into an owner project command. */
export function parseCreateOwnerProject(
	input: unknown
): Either.Either<CreateOwnerProjectInput, OwnerProjectInputError> {
	const decoded = Schema.decodeUnknownEither(ProjectFormSchema)(input);
	return Either.isLeft(decoded)
		? Either.left(
				new OwnerProjectInputError(
					'Project name, description, lifecycle, and a lowercase hyphenated slug are required.'
				)
			)
		: Either.right(decoded.right);
}

/** Parse an untrusted project-update form into an owner project command. */
export function parseUpdateOwnerProject(
	input: unknown
): Either.Either<UpdateOwnerProjectInput, OwnerProjectInputError> {
	const decoded = Schema.decodeUnknownEither(UpdateProjectFormSchema)(input);
	return Either.isLeft(decoded)
		? Either.left(new OwnerProjectInputError('Valid owner project fields are required.'))
		: Either.right(decoded.right);
}

/** Parse an untrusted project-resource form into a confirmed association command. */
export function parseAddOwnerProjectResource(
	input: unknown
): Either.Either<AddOwnerProjectResourceInput, OwnerProjectInputError> {
	const decoded = Schema.decodeUnknownEither(ProjectResourceFormSchema)(input);
	if (Either.isLeft(decoded)) {
		return Either.left(new OwnerProjectInputError('Valid project resource fields are required.'));
	}
	const canonicalUrl = parseCanonicalUrl(decoded.right.canonicalUrl);
	return Either.isLeft(canonicalUrl)
		? Either.left(canonicalUrl.left)
		: Either.right({ ...decoded.right, canonicalUrl: canonicalUrl.right });
}

/** Parse an untrusted resource-removal form into an owner-scoped resource identifier. */
export function parseRemoveOwnerProjectResource(
	input: unknown
): Either.Either<string, OwnerProjectInputError> {
	const decoded = Schema.decodeUnknownEither(ResourceIdFormSchema)(input);
	return Either.isLeft(decoded)
		? Either.left(new OwnerProjectInputError('A valid project resource identifier is required.'))
		: Either.right(decoded.right.id);
}
