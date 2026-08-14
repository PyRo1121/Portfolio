import { Either, Schema } from 'effect';

/** Opportunity stages used by the private career pipeline. */
export const CareerStageSchema = Schema.Union(
	Schema.Literal('Interested'),
	Schema.Literal('Researching'),
	Schema.Literal('Applied'),
	Schema.Literal('Contacted'),
	Schema.Literal('Interviewing'),
	Schema.Literal('Offer'),
	Schema.Literal('Closed')
);
export type CareerStage = Schema.Schema.Type<typeof CareerStageSchema>;

/** Ordered career stages used by pipeline navigation and storage. */
export const careerStages: ReadonlyArray<CareerStage> = [
	'Interested',
	'Researching',
	'Applied',
	'Contacted',
	'Interviewing',
	'Offer',
	'Closed'
];

/** One private job opportunity. */
export type CareerOpportunity = {
	readonly id: string;
	readonly company: string;
	readonly role: string;
	readonly jobUrl: string | null;
	readonly stage: CareerStage;
	readonly nextAction: string | null;
	readonly nextActionDue: string | null;
	readonly contact: string | null;
	readonly resumeVersion: string | null;
	readonly notes: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
};

/** One build or career commitment. */
export type CareerCommitment = {
	readonly id: string;
	readonly kind: 'Build' | 'Career';
	readonly text: string;
	readonly dueOn: string | null;
	readonly status: 'Open' | 'Done';
	readonly createdAt: string;
	readonly updatedAt: string;
};

/** Durable GitHub outcome evidence associated after server-side snapshot verification. */
export type ObservedCareerStoryEvidence = {
	readonly _tag: 'Observed';
	readonly source: 'GitHub';
	readonly kind: 'PullRequest' | 'Issue' | 'Release';
	readonly title: string;
	readonly repository: string;
	readonly url: string;
	readonly occurredAt: string;
	readonly observedAt: string;
};

/** A legacy story link that has not been verified against retained delivery evidence. */
export type UnavailableCareerStoryEvidence = {
	readonly _tag: 'Unavailable';
	readonly url: string;
	readonly reason: string;
};

export type CareerStoryEvidence = ObservedCareerStoryEvidence | UnavailableCareerStoryEvidence;

/** One private or sanitized interview story draft. */
export type CareerStory = {
	readonly id: string;
	readonly title: string;
	readonly problem: string;
	readonly action: string;
	readonly outcome: string;
	readonly evidence: CareerStoryEvidence | null;
	readonly visibility: 'Private' | 'ShareDraft';
	readonly createdAt: string;
	readonly updatedAt: string;
};

/** Complete owner-scoped career workspace state. */
export type CareerSnapshot = {
	readonly opportunities: ReadonlyArray<CareerOpportunity>;
	readonly commitments: ReadonlyArray<CareerCommitment>;
	readonly stories: ReadonlyArray<CareerStory>;
	readonly summary: {
		readonly activeOpportunities: number;
		readonly interviewing: number;
		readonly overdueActions: number;
		readonly openCommitments: number;
		readonly storyDrafts: number;
	};
};

const RequiredText = Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(180));
const OptionalText = Schema.Trim.pipe(Schema.maxLength(2_000));
const OptionalShortText = Schema.Trim.pipe(Schema.maxLength(180));
const DateInput = Schema.Trim.pipe(Schema.maxLength(10));

const OpportunityFormSchema = Schema.Struct({
	company: RequiredText,
	role: RequiredText,
	jobUrl: Schema.Trim.pipe(Schema.maxLength(2_048)),
	stage: CareerStageSchema,
	nextAction: OptionalShortText,
	nextActionDue: DateInput,
	contact: OptionalShortText,
	resumeVersion: OptionalShortText,
	notes: OptionalText
});
const OpportunityIdFormSchema = Schema.Struct({ id: Schema.UUID });
const StageFormSchema = Schema.Struct({ id: Schema.UUID, stage: CareerStageSchema });
const CommitmentFormSchema = Schema.Struct({
	kind: Schema.Union(Schema.Literal('Build'), Schema.Literal('Career')),
	text: RequiredText,
	dueOn: DateInput
});
const CommitmentStatusFormSchema = Schema.Struct({
	id: Schema.UUID,
	status: Schema.Union(Schema.Literal('Open'), Schema.Literal('Done'))
});
const StoryIdFormSchema = Schema.Struct({ id: Schema.UUID });
const StoryFormSchema = Schema.Struct({
	title: RequiredText,
	problem: Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(2_000)),
	action: Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(2_000)),
	outcome: Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(2_000)),
	evidenceUrl: Schema.Trim.pipe(Schema.maxLength(2_048)),
	visibility: Schema.Union(Schema.Literal('Private'), Schema.Literal('ShareDraft'))
});

/** Parsed opportunity creation input. */
export type CreateOpportunityInput = {
	readonly company: string;
	readonly role: string;
	readonly jobUrl: string | null;
	readonly stage: CareerStage;
	readonly nextAction: string | null;
	readonly nextActionDue: string | null;
	readonly contact: string | null;
	readonly resumeVersion: string | null;
	readonly notes: string | null;
};

/** Parsed owner-scoped opportunity update input. */
export type UpdateOpportunityInput = CreateOpportunityInput & { readonly id: string };

/** Parsed commitment creation input. */
export type CreateCommitmentInput = {
	readonly kind: 'Build' | 'Career';
	readonly text: string;
	readonly dueOn: string | null;
};

/** Parsed interview-story creation input. */
export type CreateStoryInput = {
	readonly title: string;
	readonly problem: string;
	readonly action: string;
	readonly outcome: string;
	readonly evidenceUrl: string | null;
	readonly visibility: 'Private' | 'ShareDraft';
};

/** Parsed owner-scoped interview-story update input. */
export type UpdateStoryInput = CreateStoryInput & { readonly id: string };

/** Stable, user-safe form parsing failure. */
export class CareerInputError extends Error {
	readonly _tag = 'CareerInputError';

	constructor(readonly reason: string) {
		super(reason);
	}
}

function optionalValue(value: string): string | null {
	return value.length === 0 ? null : value;
}

function parsedHttpsUrl(value: string): Either.Either<string | null, CareerInputError> {
	if (value.length === 0) return Either.right(null);
	const parsed = URL.parse(value);
	return parsed !== null && (parsed.protocol === 'https:' || parsed.protocol === 'http:')
		? Either.right(parsed.toString())
		: Either.left(new CareerInputError('Links must be valid HTTP or HTTPS URLs.'));
}

function parsedOptionalDate(value: string): Either.Either<string | null, CareerInputError> {
	if (value.length === 0) return Either.right(null);
	const timestamp = Date.parse(`${value}T00:00:00.000Z`);
	return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
		Number.isFinite(timestamp) &&
		new Date(timestamp).toISOString().slice(0, 10) === value
		? Either.right(value)
		: Either.left(new CareerInputError('Dates must be valid calendar dates.'));
}

/** Parse untrusted opportunity form input into a domain command. */
export function parseCreateOpportunity(
	input: unknown
): Either.Either<CreateOpportunityInput, CareerInputError> {
	const decoded = Schema.decodeUnknownEither(OpportunityFormSchema)(input);
	if (Either.isLeft(decoded)) {
		return Either.left(
			new CareerInputError('Company, role, stage, and field limits are required.')
		);
	}
	const jobUrl = parsedHttpsUrl(decoded.right.jobUrl);
	if (Either.isLeft(jobUrl)) return Either.left(jobUrl.left);
	const nextActionDue = parsedOptionalDate(decoded.right.nextActionDue);
	if (Either.isLeft(nextActionDue)) return Either.left(nextActionDue.left);
	return Either.right({
		company: decoded.right.company,
		role: decoded.right.role,
		jobUrl: jobUrl.right,
		stage: decoded.right.stage,
		nextAction: optionalValue(decoded.right.nextAction),
		nextActionDue: nextActionDue.right,
		contact: optionalValue(decoded.right.contact),
		resumeVersion: optionalValue(decoded.right.resumeVersion),
		notes: optionalValue(decoded.right.notes)
	});
}

/** Parse an untrusted opportunity update form into an owner-scoped command. */
export function parseUpdateOpportunity(
	input: unknown
): Either.Either<UpdateOpportunityInput, CareerInputError> {
	const identity = Schema.decodeUnknownEither(OpportunityIdFormSchema)(input);
	if (Either.isLeft(identity)) {
		return Either.left(new CareerInputError('A valid opportunity is required.'));
	}
	const opportunity = parseCreateOpportunity(input);
	return Either.isLeft(opportunity)
		? Either.left(opportunity.left)
		: Either.right({ id: identity.right.id, ...opportunity.right });
}

/** Parse an untrusted stage-transition form. */
export function parseStageTransition(
	input: unknown
): Either.Either<{ readonly id: string; readonly stage: CareerStage }, CareerInputError> {
	const decoded = Schema.decodeUnknownEither(StageFormSchema)(input);
	return Either.isRight(decoded)
		? Either.right(decoded.right)
		: Either.left(new CareerInputError('Opportunity and target stage are required.'));
}

/** Parse an untrusted commitment form. */
export function parseCreateCommitment(
	input: unknown
): Either.Either<CreateCommitmentInput, CareerInputError> {
	const decoded = Schema.decodeUnknownEither(CommitmentFormSchema)(input);
	if (Either.isLeft(decoded)) {
		return Either.left(new CareerInputError('Commitment type and text are required.'));
	}
	const dueOn = parsedOptionalDate(decoded.right.dueOn);
	return Either.isLeft(dueOn)
		? Either.left(dueOn.left)
		: Either.right({ kind: decoded.right.kind, text: decoded.right.text, dueOn: dueOn.right });
}

/** Parse an untrusted commitment status change. */
export function parseCommitmentStatus(
	input: unknown
): Either.Either<{ readonly id: string; readonly status: 'Open' | 'Done' }, CareerInputError> {
	const decoded = Schema.decodeUnknownEither(CommitmentStatusFormSchema)(input);
	return Either.isRight(decoded)
		? Either.right(decoded.right)
		: Either.left(new CareerInputError('Commitment and status are required.'));
}

/** Parse an untrusted interview-story form. */
export function parseCreateStory(
	input: unknown
): Either.Either<CreateStoryInput, CareerInputError> {
	const decoded = Schema.decodeUnknownEither(StoryFormSchema)(input);
	if (Either.isLeft(decoded)) {
		return Either.left(new CareerInputError('Title, problem, action, and outcome are required.'));
	}
	const evidenceUrl = parsedHttpsUrl(decoded.right.evidenceUrl);
	if (Either.isLeft(evidenceUrl)) return Either.left(evidenceUrl.left);
	return Either.right({
		title: decoded.right.title,
		problem: decoded.right.problem,
		action: decoded.right.action,
		outcome: decoded.right.outcome,
		evidenceUrl: evidenceUrl.right,
		visibility: decoded.right.visibility
	});
}

/** Parse an untrusted interview-story update form into an owner-scoped command. */
export function parseUpdateStory(
	input: unknown
): Either.Either<UpdateStoryInput, CareerInputError> {
	const identity = Schema.decodeUnknownEither(StoryIdFormSchema)(input);
	if (Either.isLeft(identity)) {
		return Either.left(new CareerInputError('A valid interview story is required.'));
	}
	const story = parseCreateStory(input);
	return Either.isLeft(story)
		? Either.left(story.left)
		: Either.right({ id: identity.right.id, ...story.right });
}

/** Derive transparent career-pipeline summary counts. */
export function summarizeCareer(
	opportunities: ReadonlyArray<CareerOpportunity>,
	commitments: ReadonlyArray<CareerCommitment>,
	stories: ReadonlyArray<CareerStory>,
	today: string
): CareerSnapshot['summary'] {
	return {
		activeOpportunities: opportunities.filter(
			(opportunity) => opportunity.stage !== 'Closed' && opportunity.stage !== 'Offer'
		).length,
		interviewing: opportunities.filter((opportunity) => opportunity.stage === 'Interviewing')
			.length,
		overdueActions: opportunities.filter(
			(opportunity) =>
				opportunity.nextActionDue !== null &&
				opportunity.nextActionDue < today &&
				opportunity.stage !== 'Closed'
		).length,
		openCommitments: commitments.filter((commitment) => commitment.status === 'Open').length,
		storyDrafts: stories.length
	};
}
