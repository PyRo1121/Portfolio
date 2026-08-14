import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { Effect, Schema } from 'effect';
import type {
	CareerStory,
	CreateStoryInput,
	ObservedCareerStoryEvidence,
	UpdateStoryInput
} from '$lib/domain/career-accountability';
import { CareerStoreError } from '$lib/server/career-store-error';

export const CareerStoryRowSchema = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	problem: Schema.String,
	action: Schema.String,
	outcome: Schema.String,
	evidence_url: Schema.NullOr(Schema.String),
	visibility: Schema.Union(Schema.Literal('Private'), Schema.Literal('ShareDraft')),
	created_at: Schema.String,
	updated_at: Schema.String,
	evidence_source: Schema.NullOr(Schema.Literal('GitHub')),
	evidence_kind: Schema.NullOr(
		Schema.Union(Schema.Literal('PullRequest'), Schema.Literal('Issue'), Schema.Literal('Release'))
	),
	evidence_title: Schema.NullOr(Schema.String),
	evidence_repository: Schema.NullOr(Schema.String),
	evidence_canonical_url: Schema.NullOr(Schema.String),
	evidence_occurred_at: Schema.NullOr(Schema.String),
	evidence_observed_at: Schema.NullOr(Schema.String)
});

type CareerStoryRow = Schema.Schema.Type<typeof CareerStoryRowSchema>;

function observedEvidenceFromRow(row: CareerStoryRow): ObservedCareerStoryEvidence | null {
	if (
		row.evidence_source === null ||
		row.evidence_kind === null ||
		row.evidence_title === null ||
		row.evidence_repository === null ||
		row.evidence_canonical_url === null ||
		row.evidence_occurred_at === null ||
		row.evidence_observed_at === null
	) {
		return null;
	}
	return {
		_tag: 'Observed',
		source: row.evidence_source,
		kind: row.evidence_kind,
		title: row.evidence_title,
		repository: row.evidence_repository,
		url: row.evidence_canonical_url,
		occurredAt: row.evidence_occurred_at,
		observedAt: row.evidence_observed_at
	};
}

/** Parse one joined story row while preserving legacy links as explicitly unavailable. */
export function careerStoryFromRow(row: CareerStoryRow): CareerStory {
	const observedEvidence = observedEvidenceFromRow(row);
	return {
		id: row.id,
		title: row.title,
		problem: row.problem,
		action: row.action,
		outcome: row.outcome,
		evidence:
			observedEvidence ??
			(row.evidence_url === null
				? null
				: {
						_tag: 'Unavailable',
						url: row.evidence_url,
						reason: 'Legacy link was not associated with retained GitHub delivery evidence.'
					}),
		visibility: row.visibility,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function evidenceInsertStatement(
	database: D1Database,
	storyId: string,
	ownerEmail: string,
	evidence: ObservedCareerStoryEvidence
): D1PreparedStatement {
	return database
		.prepare(
			`INSERT INTO career_story_evidence
			 (story_id, owner_email, source, artifact_kind, artifact_title, repository, url,
			  occurred_at, observed_at)
			 SELECT id, owner_email, ?, ?, ?, ?, ?, ?, ?
			 FROM career_stories WHERE id = ? AND owner_email = ?`
		)
		.bind(
			evidence.source,
			evidence.kind,
			evidence.title,
			evidence.repository,
			evidence.url,
			evidence.occurredAt,
			evidence.observedAt,
			storyId,
			ownerEmail
		);
}

/** Insert one owner-scoped interview story and optional observed evidence transactionally. */
export function createCareerStory(
	database: D1Database,
	ownerEmail: string,
	input: CreateStoryInput,
	evidence: ObservedCareerStoryEvidence | null,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const id = crypto.randomUUID();
			const timestamp = now.toISOString();
			const statements: Array<D1PreparedStatement> = [
				database
					.prepare(
						`INSERT INTO career_stories
						 (id, owner_email, title, problem, action, outcome, evidence_url, visibility,
						  created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(
						id,
						ownerEmail,
						input.title,
						input.problem,
						input.action,
						input.outcome,
						evidence?.url ?? null,
						input.visibility,
						timestamp,
						timestamp
					)
			];
			if (evidence !== null) {
				statements.push(evidenceInsertStatement(database, id, ownerEmail, evidence));
			}
			await database.batch(statements);
		},
		catch: (cause) => new CareerStoreError('create story', cause)
	});
}

/** Update one owner-scoped story and replace its evidence association transactionally. */
export function updateCareerStory(
	database: D1Database,
	ownerEmail: string,
	input: UpdateStoryInput,
	evidence: ObservedCareerStoryEvidence | null,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const statements: Array<D1PreparedStatement> = [
				database
					.prepare(
						`UPDATE career_stories
						 SET title = ?, problem = ?, action = ?, outcome = ?, evidence_url = ?,
						     visibility = ?, updated_at = ?
						 WHERE id = ? AND owner_email = ?`
					)
					.bind(
						input.title,
						input.problem,
						input.action,
						input.outcome,
						evidence?.url ?? null,
						input.visibility,
						now.toISOString(),
						input.id,
						ownerEmail
					),
				database
					.prepare(
						`DELETE FROM career_story_evidence
						 WHERE story_id = ? AND owner_email = ?`
					)
					.bind(input.id, ownerEmail)
			];
			if (evidence !== null) {
				statements.push(evidenceInsertStatement(database, input.id, ownerEmail, evidence));
			}
			await database.batch(statements);
		},
		catch: (cause) => new CareerStoreError('update story', cause)
	});
}

/** Load only owner-scoped stories explicitly marked for sanitized export. */
export function loadShareDraftStories(
	database: D1Database,
	ownerEmail: string
): Effect.Effect<ReadonlyArray<CareerStory>, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const result = await database
				.prepare(
					`SELECT s.id, s.title, s.problem, s.action, s.outcome, s.evidence_url,
				            s.visibility, s.created_at, s.updated_at,
				            e.source AS evidence_source, e.artifact_kind AS evidence_kind,
				            e.artifact_title AS evidence_title,
				            e.repository AS evidence_repository,
				            e.url AS evidence_canonical_url,
				            e.occurred_at AS evidence_occurred_at,
				            e.observed_at AS evidence_observed_at
				     FROM career_stories s
				     LEFT JOIN career_story_evidence e
				       ON e.story_id = s.id AND e.owner_email = s.owner_email
				     WHERE s.owner_email = ? AND s.visibility = 'ShareDraft'
				     ORDER BY s.updated_at DESC`
				)
				.bind(ownerEmail)
				.all();
			return Schema.decodeUnknownSync(Schema.Array(CareerStoryRowSchema))(result.results).map(
				careerStoryFromRow
			);
		},
		catch: (cause) => new CareerStoreError('load share drafts', cause)
	});
}
