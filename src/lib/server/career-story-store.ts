import type { D1Database } from '@cloudflare/workers-types';
import { Effect, Schema } from 'effect';
import type {
	CareerStory,
	CreateStoryInput,
	UpdateStoryInput
} from '$lib/domain/career-accountability';
import { CareerStoreError } from './career-store';

const StoryRowSchema = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	problem: Schema.String,
	action: Schema.String,
	outcome: Schema.String,
	evidence_url: Schema.NullOr(Schema.String),
	visibility: Schema.Union(Schema.Literal('Private'), Schema.Literal('ShareDraft')),
	created_at: Schema.String,
	updated_at: Schema.String
});

function storyFromRow(row: Schema.Schema.Type<typeof StoryRowSchema>): CareerStory {
	return {
		id: row.id,
		title: row.title,
		problem: row.problem,
		action: row.action,
		outcome: row.outcome,
		evidenceUrl: row.evidence_url,
		visibility: row.visibility,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/** Insert one owner-scoped interview story draft. */
export function createCareerStory(
	database: D1Database,
	ownerEmail: string,
	input: CreateStoryInput,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const timestamp = now.toISOString();
			await database
				.prepare(
					`INSERT INTO career_stories
					 (id, owner_email, title, problem, action, outcome, evidence_url, visibility,
					  created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					crypto.randomUUID(),
					ownerEmail,
					input.title,
					input.problem,
					input.action,
					input.outcome,
					input.evidenceUrl,
					input.visibility,
					timestamp,
					timestamp
				)
				.run();
		},
		catch: (cause) => new CareerStoreError('create story', cause)
	});
}

/** Update one owner-scoped interview story draft. */
export function updateCareerStory(
	database: D1Database,
	ownerEmail: string,
	input: UpdateStoryInput,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			await database
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
					input.evidenceUrl,
					input.visibility,
					now.toISOString(),
					input.id,
					ownerEmail
				)
				.run();
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
					`SELECT id, title, problem, action, outcome, evidence_url, visibility,
					        created_at, updated_at
					 FROM career_stories
					 WHERE owner_email = ? AND visibility = 'ShareDraft'
					 ORDER BY updated_at DESC`
				)
				.bind(ownerEmail)
				.all();
			return Schema.decodeUnknownSync(Schema.Array(StoryRowSchema))(result.results).map(
				storyFromRow
			);
		},
		catch: (cause) => new CareerStoreError('load share drafts', cause)
	});
}
