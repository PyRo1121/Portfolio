import type { D1Database } from '@cloudflare/workers-types';
import { Effect, Schema } from 'effect';
import {
	CareerStageSchema,
	summarizeCareer,
	type CareerCommitment,
	type CareerOpportunity,
	type CareerSnapshot,
	type CareerStage,
	type CreateCommitmentInput,
	type CreateOpportunityInput,
	type UpdateOpportunityInput
} from '$lib/domain/career-accountability';
import { CareerStoryRowSchema, careerStoryFromRow } from './career-story-store';
import { CareerStoreError } from './career-store-error';

const OpportunityRowSchema = Schema.Struct({
	id: Schema.String,
	company: Schema.String,
	role: Schema.String,
	job_url: Schema.NullOr(Schema.String),
	stage: CareerStageSchema,
	next_action: Schema.NullOr(Schema.String),
	next_action_due: Schema.NullOr(Schema.String),
	contact: Schema.NullOr(Schema.String),
	resume_version: Schema.NullOr(Schema.String),
	notes: Schema.NullOr(Schema.String),
	created_at: Schema.String,
	updated_at: Schema.String
});
const CommitmentRowSchema = Schema.Struct({
	id: Schema.String,
	kind: Schema.Union(Schema.Literal('Build'), Schema.Literal('Career')),
	text: Schema.String,
	due_on: Schema.NullOr(Schema.String),
	status: Schema.Union(Schema.Literal('Open'), Schema.Literal('Done')),
	created_at: Schema.String,
	updated_at: Schema.String
});
const StageRowSchema = Schema.Struct({ stage: CareerStageSchema });

function opportunityFromRow(
	row: Schema.Schema.Type<typeof OpportunityRowSchema>
): CareerOpportunity {
	return {
		id: row.id,
		company: row.company,
		role: row.role,
		jobUrl: row.job_url,
		stage: row.stage,
		nextAction: row.next_action,
		nextActionDue: row.next_action_due,
		contact: row.contact,
		resumeVersion: row.resume_version,
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function commitmentFromRow(row: Schema.Schema.Type<typeof CommitmentRowSchema>): CareerCommitment {
	return {
		id: row.id,
		kind: row.kind,
		text: row.text,
		dueOn: row.due_on,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/** Load the complete owner-scoped Career workspace from D1. */
export function loadCareerSnapshot(
	database: D1Database,
	ownerEmail: string,
	now: Date
): Effect.Effect<CareerSnapshot, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const [opportunityResult, commitmentResult, storyResult] = await Promise.all([
				database
					.prepare(
						`SELECT id, company, role, job_url, stage, next_action, next_action_due,
						 contact, resume_version, notes, created_at, updated_at
						 FROM career_opportunities WHERE owner_email = ? ORDER BY updated_at DESC`
					)
					.bind(ownerEmail)
					.all(),
				database
					.prepare(
						`SELECT id, kind, text, due_on, status, created_at, updated_at
						 FROM career_commitments WHERE owner_email = ?
						 ORDER BY status ASC, updated_at DESC`
					)
					.bind(ownerEmail)
					.all(),
				database
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
						 WHERE s.owner_email = ? ORDER BY s.updated_at DESC`
					)
					.bind(ownerEmail)
					.all()
			]);
			const opportunities = Schema.decodeUnknownSync(Schema.Array(OpportunityRowSchema))(
				opportunityResult.results
			).map(opportunityFromRow);
			const commitments = Schema.decodeUnknownSync(Schema.Array(CommitmentRowSchema))(
				commitmentResult.results
			).map(commitmentFromRow);
			const stories = Schema.decodeUnknownSync(Schema.Array(CareerStoryRowSchema))(
				storyResult.results
			).map(careerStoryFromRow);
			return {
				opportunities,
				commitments,
				stories,
				summary: summarizeCareer(
					opportunities,
					commitments,
					stories,
					now.toISOString().slice(0, 10)
				)
			};
		},
		catch: (cause) => new CareerStoreError('load', cause)
	});
}

/** Insert one opportunity and its initial stage event transactionally. */
export function createCareerOpportunity(
	database: D1Database,
	ownerEmail: string,
	input: CreateOpportunityInput,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const id = crypto.randomUUID();
			const timestamp = now.toISOString();
			await database.batch([
				database
					.prepare(
						`INSERT INTO career_opportunities
						 (id, owner_email, company, role, job_url, stage, next_action, next_action_due,
						  contact, resume_version, notes, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(
						id,
						ownerEmail,
						input.company,
						input.role,
						input.jobUrl,
						input.stage,
						input.nextAction,
						input.nextActionDue,
						input.contact,
						input.resumeVersion,
						input.notes,
						timestamp,
						timestamp
					),
				database
					.prepare(
						`INSERT INTO career_stage_events
						 (id, opportunity_id, owner_email, from_stage, to_stage, occurred_at)
						 VALUES (?, ?, ?, NULL, ?, ?)`
					)
					.bind(crypto.randomUUID(), id, ownerEmail, input.stage, timestamp)
			]);
		},
		catch: (cause) => new CareerStoreError('create opportunity', cause)
	});
}

/** Update one owner-scoped opportunity and record a stage change when one occurred. */
export function updateCareerOpportunity(
	database: D1Database,
	ownerEmail: string,
	input: UpdateOpportunityInput,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const raw = await database
				.prepare('SELECT stage FROM career_opportunities WHERE id = ? AND owner_email = ?')
				.bind(input.id, ownerEmail)
				.first();
			const current = Schema.decodeUnknownSync(StageRowSchema)(raw);
			const timestamp = now.toISOString();
			const update = database
				.prepare(
					`UPDATE career_opportunities
					 SET company = ?, role = ?, job_url = ?, stage = ?, next_action = ?,
					     next_action_due = ?, contact = ?, resume_version = ?, notes = ?, updated_at = ?
					 WHERE id = ? AND owner_email = ?`
				)
				.bind(
					input.company,
					input.role,
					input.jobUrl,
					input.stage,
					input.nextAction,
					input.nextActionDue,
					input.contact,
					input.resumeVersion,
					input.notes,
					timestamp,
					input.id,
					ownerEmail
				);
			if (current.stage === input.stage) {
				await update.run();
				return;
			}
			await database.batch([
				update,
				database
					.prepare(
						`INSERT INTO career_stage_events
						 (id, opportunity_id, owner_email, from_stage, to_stage, occurred_at)
						 VALUES (?, ?, ?, ?, ?, ?)`
					)
					.bind(crypto.randomUUID(), input.id, ownerEmail, current.stage, input.stage, timestamp)
			]);
		},
		catch: (cause) => new CareerStoreError('update opportunity', cause)
	});
}

/** Move one owner-scoped opportunity and record the transition transactionally. */
export function transitionCareerOpportunity(
	database: D1Database,
	ownerEmail: string,
	id: string,
	toStage: CareerStage,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const raw = await database
				.prepare('SELECT stage FROM career_opportunities WHERE id = ? AND owner_email = ?')
				.bind(id, ownerEmail)
				.first();
			const row = Schema.decodeUnknownSync(StageRowSchema)(raw);
			const timestamp = now.toISOString();
			await database.batch([
				database
					.prepare(
						`UPDATE career_opportunities SET stage = ?, updated_at = ?
						 WHERE id = ? AND owner_email = ?`
					)
					.bind(toStage, timestamp, id, ownerEmail),
				database
					.prepare(
						`INSERT INTO career_stage_events
						 (id, opportunity_id, owner_email, from_stage, to_stage, occurred_at)
						 VALUES (?, ?, ?, ?, ?, ?)`
					)
					.bind(crypto.randomUUID(), id, ownerEmail, row.stage, toStage, timestamp)
			]);
		},
		catch: (cause) => new CareerStoreError('transition opportunity', cause)
	});
}

/** Insert one build or career commitment. */
export function createCareerCommitment(
	database: D1Database,
	ownerEmail: string,
	input: CreateCommitmentInput,
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const timestamp = now.toISOString();
			await database
				.prepare(
					`INSERT INTO career_commitments
					 (id, owner_email, kind, text, due_on, status, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, 'Open', ?, ?)`
				)
				.bind(
					crypto.randomUUID(),
					ownerEmail,
					input.kind,
					input.text,
					input.dueOn,
					timestamp,
					timestamp
				)
				.run();
		},
		catch: (cause) => new CareerStoreError('create commitment', cause)
	});
}

/** Update one owner-scoped commitment status. */
export function setCareerCommitmentStatus(
	database: D1Database,
	ownerEmail: string,
	id: string,
	status: 'Open' | 'Done',
	now: Date
): Effect.Effect<void, CareerStoreError> {
	return Effect.tryPromise({
		try: async () => {
			await database
				.prepare(
					`UPDATE career_commitments SET status = ?, updated_at = ?
					 WHERE id = ? AND owner_email = ?`
				)
				.bind(status, now.toISOString(), id, ownerEmail)
				.run();
		},
		catch: (cause) => new CareerStoreError('update commitment', cause)
	});
}
