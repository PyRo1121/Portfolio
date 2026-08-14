import type { CareerCommitment, CareerSnapshot, CareerStory } from './career-accountability';
import {
	createCareerAccountabilityView,
	type CareerFollowUpReminder
} from './career-workspace-view';
import {
	formatCloudflareMetric,
	type CloudflareMetric,
	type CloudflareProductEvidence,
	type CloudflareUsageSnapshot
} from './cloudflare-usage';
import type {
	DeliveryArtifact,
	GitHubDashboardSnapshot,
	RepositoryIntelligence,
	WorkflowRunInput
} from './github-intelligence';

/** Evidence states rendered in the accountability review. */
type AccountabilityEvidenceState =
	'Observed' | 'Inferred' | 'Measured' | 'Provisioned' | 'Unavailable';

type AccountabilityEvidenceLink = {
	readonly label: string;
	readonly url: string;
};

type AccountabilityOutcome = {
	readonly state: 'Observed' | 'Unavailable';
	readonly headline: string;
	readonly detail: string;
	readonly repository: string | null;
	readonly occurredAt: string | null;
	readonly evidence: AccountabilityEvidenceLink | null;
	readonly verification: {
		readonly state: 'Observed' | 'Unavailable';
		readonly detail: string;
		readonly evidence: AccountabilityEvidenceLink | null;
	};
	readonly selectionFormula: string;
};

type AccountabilityCommitment = {
	readonly kind: 'Build' | 'Career';
	readonly state: 'Observed' | 'Unavailable';
	readonly text: string;
	readonly dueOn: string | null;
	readonly dueLabel: string;
};

type AccountabilityCoverageLane = {
	readonly id: 'delivery' | 'typescript' | 'verification' | 'operations' | 'data' | 'communication';
	readonly label: string;
	readonly state: AccountabilityEvidenceState;
	readonly detail: string;
	readonly evidence: AccountabilityEvidenceLink | null;
};

export type CareerAccountabilityReview = {
	readonly date: string;
	readonly outcome: AccountabilityOutcome;
	readonly buildCommitment: AccountabilityCommitment;
	readonly careerCommitment: AccountabilityCommitment;
	readonly followUpWarnings: ReadonlyArray<CareerFollowUpReminder>;
	readonly nextFollowUp: CareerFollowUpReminder | null;
	readonly coverage: ReadonlyArray<AccountabilityCoverageLane>;
	readonly relevance: {
		readonly state: 'Inferred' | 'Unavailable';
		readonly headline: string;
		readonly limitation: string;
	};
};

const DAY_IN_MILLISECONDS = 86_400_000;
const OUTCOME_SELECTION_FORMULA =
	'Among retained artifacts: stable release > merged pull request > closed issue > prerelease; newest occurrence breaks ties.';

function artifactRank(artifact: DeliveryArtifact): number {
	if (artifact.kind === 'Release') return artifact.detail.includes('prerelease') ? 1 : 4;
	if (artifact.kind === 'PullRequest') return 3;
	if (artifact.kind === 'Issue') return 2;
	return 0;
}

function strongestOutcome(snapshot: GitHubDashboardSnapshot): DeliveryArtifact | null {
	return (
		[...snapshot.intelligence.delivery.artifacts]
			.filter((artifact) => artifact.status === 'shipped' && artifact.kind !== 'WorkflowRun')
			.sort((left, right) => {
				const rankDelta = artifactRank(right) - artifactRank(left);
				return rankDelta === 0 ? right.occurredAt.localeCompare(left.occurredAt) : rankDelta;
			})[0] ?? null
	);
}

function successfulWorkflowFor(
	repository: string,
	runs: ReadonlyArray<WorkflowRunInput>
): WorkflowRunInput | null {
	return (
		[...runs]
			.filter((run) => run.repository === repository && run.conclusion === 'success')
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
	);
}

function outcomeHeadline(artifact: DeliveryArtifact): string {
	if (artifact.kind === 'Release') return `I published “${artifact.title}”.`;
	if (artifact.kind === 'PullRequest') return `I shipped “${artifact.title}”.`;
	return `I closed “${artifact.title}”.`;
}

function createOutcome(snapshot: GitHubDashboardSnapshot): AccountabilityOutcome {
	const artifact = strongestOutcome(snapshot);
	if (artifact === null) {
		return {
			state: 'Unavailable',
			headline: 'No delivery outcome is available for this rolling window.',
			detail: 'Commits are not promoted to outcomes without a merged PR, closed issue, or release.',
			repository: null,
			occurredAt: null,
			evidence: null,
			verification: {
				state: 'Unavailable',
				detail: 'There is no selected outcome to match with a successful repository workflow.',
				evidence: null
			},
			selectionFormula: OUTCOME_SELECTION_FORMULA
		};
	}
	const workflow = successfulWorkflowFor(
		artifact.repository,
		snapshot.intelligence.delivery.workflows.current.recent
	);
	return {
		state: 'Observed',
		headline: outcomeHeadline(artifact),
		detail: `${artifact.detail} · ${artifact.repository}`,
		repository: artifact.repository,
		occurredAt: artifact.occurredAt,
		evidence: { label: 'Open GitHub evidence', url: artifact.url },
		verification:
			workflow === null
				? {
						state: 'Unavailable',
						detail: 'No successful retained workflow could be matched to this repository.',
						evidence: null
					}
				: {
						state: 'Observed',
						detail: `${workflow.name} passed on ${workflow.branch ?? workflow.event}.`,
						evidence: { label: 'Open workflow run', url: workflow.url }
					},
		selectionFormula: OUTCOME_SELECTION_FORMULA
	};
}

function dateDeltaInDays(dueOn: string, today: string): number | null {
	const dueTimestamp = Date.parse(`${dueOn}T00:00:00.000Z`);
	const todayTimestamp = Date.parse(`${today}T00:00:00.000Z`);
	return Number.isFinite(dueTimestamp) && Number.isFinite(todayTimestamp)
		? Math.round((dueTimestamp - todayTimestamp) / DAY_IN_MILLISECONDS)
		: null;
}

function commitmentDueLabel(dueOn: string | null, today: string): string {
	if (dueOn === null) return 'No due date';
	const delta = dateDeltaInDays(dueOn, today);
	if (delta === null) return 'Date unavailable';
	if (delta < 0) return `${Math.abs(delta)}d overdue`;
	if (delta === 0) return 'Due today';
	if (delta === 1) return 'Due tomorrow';
	return `Due in ${delta}d`;
}

function selectedCommitment(
	commitments: ReadonlyArray<CareerCommitment>,
	kind: 'Build' | 'Career',
	today: string
): AccountabilityCommitment {
	const selected = [...commitments]
		.filter((commitment) => commitment.kind === kind && commitment.status === 'Open')
		.sort((left, right) => {
			const dateDelta = (left.dueOn ?? '9999-12-31').localeCompare(right.dueOn ?? '9999-12-31');
			return dateDelta === 0 ? right.updatedAt.localeCompare(left.updatedAt) : dateDelta;
		})[0];
	return selected === undefined
		? {
				kind,
				state: 'Unavailable',
				text: `Set one ${kind.toLowerCase()} commitment.`,
				dueOn: null,
				dueLabel: 'Not set'
			}
		: {
				kind,
				state: 'Observed',
				text: selected.text,
				dueOn: selected.dueOn,
				dueLabel: commitmentDueLabel(selected.dueOn, today)
			};
}

function deliveryCoverage(outcome: AccountabilityOutcome): AccountabilityCoverageLane {
	return {
		id: 'delivery',
		label: 'Outcome ownership',
		state: outcome.state,
		detail:
			outcome.state === 'Observed'
				? 'An authored delivery artifact landed in the rolling window.'
				: 'No merged PR, closed issue, or release is available.',
		evidence: outcome.evidence
	};
}

function typescriptCoverage(
	repository: RepositoryIntelligence | undefined,
	hasTypeScript: boolean
): AccountabilityCoverageLane {
	if (!hasTypeScript) {
		return {
			id: 'typescript',
			label: 'TypeScript implementation',
			state: 'Unavailable',
			detail: 'TypeScript was not present in the collected language inventory.',
			evidence: null
		};
	}
	if (repository?.primaryLanguage === 'TypeScript') {
		return {
			id: 'typescript',
			label: 'TypeScript implementation',
			state: 'Observed',
			detail: `${repository.fullName} is reported by GitHub with TypeScript as its primary language.`,
			evidence: { label: 'Open repository', url: repository.url }
		};
	}
	return {
		id: 'typescript',
		label: 'TypeScript implementation',
		state: 'Observed',
		detail:
			'TypeScript is present in owned-repository language evidence; outcome-level linkage is unavailable.',
		evidence: null
	};
}

function verificationCoverage(outcome: AccountabilityOutcome): AccountabilityCoverageLane {
	return {
		id: 'verification',
		label: 'Automated verification',
		state: outcome.verification.state,
		detail: outcome.verification.detail,
		evidence: outcome.verification.evidence
	};
}

function operationsCoverage(
	workerRequests: CloudflareMetric | undefined
): AccountabilityCoverageLane {
	if (workerRequests?.state !== 'Measured') {
		return {
			id: 'operations',
			label: 'Runtime operation',
			state: 'Unavailable',
			detail: 'Measured Worker request evidence is unavailable.',
			evidence: null
		};
	}
	return {
		id: 'operations',
		label: 'Runtime operation',
		state: 'Measured',
		detail: `${formatCloudflareMetric(workerRequests)} Worker requests measured account-wide; outcome deployment linkage is unavailable.`,
		evidence: { label: 'Open Cloudflare evidence', url: workerRequests.evidenceUrl }
	};
}

function dataCoverage(d1: CloudflareProductEvidence | undefined): AccountabilityCoverageLane {
	if (d1?.state !== 'Provisioned') {
		return {
			id: 'data',
			label: 'Data platform',
			state: 'Unavailable',
			detail: 'D1 inventory evidence is unavailable.',
			evidence: null
		};
	}
	return {
		id: 'data',
		label: 'Data platform',
		state: 'Provisioned',
		detail: `${d1.count ?? 0} D1 databases provisioned account-wide; artifact ownership is not inferred.`,
		evidence: { label: 'Open D1 inventory', url: d1.evidenceUrl }
	};
}

function communicationCoverage(story: CareerStory | undefined): AccountabilityCoverageLane {
	if (story === undefined) {
		return {
			id: 'communication',
			label: 'Outcome communication',
			state: 'Unavailable',
			detail: 'No interview story has been recorded for communication evidence.',
			evidence: null
		};
	}
	return {
		id: 'communication',
		label: 'Outcome communication',
		state: 'Observed',
		detail: `Private story recorded: “${story.title}”.`,
		evidence:
			story.evidenceUrl === null ? null : { label: 'Open story evidence', url: story.evidenceUrl }
	};
}

function coverageLanes(
	snapshot: GitHubDashboardSnapshot,
	career: CareerSnapshot,
	cloudflare: CloudflareUsageSnapshot | null,
	outcome: AccountabilityOutcome
): ReadonlyArray<AccountabilityCoverageLane> {
	const repository = snapshot.intelligence.repositories.find(
		(candidate) => candidate.fullName === outcome.repository
	);
	const hasTypeScript = snapshot.intelligence.languages.some(
		(language) => language.name === 'TypeScript'
	);
	return [
		deliveryCoverage(outcome),
		typescriptCoverage(repository, hasTypeScript),
		verificationCoverage(outcome),
		operationsCoverage(cloudflare?.metrics.find((metric) => metric.id === 'workerRequests')),
		dataCoverage(cloudflare?.products.find((product) => product.id === 'd1')),
		communicationCoverage(career.stories[0])
	];
}

function relevanceNarrative(
	outcome: AccountabilityOutcome,
	coverage: ReadonlyArray<AccountabilityCoverageLane>
): CareerAccountabilityReview['relevance'] {
	if (outcome.state === 'Unavailable') {
		return {
			state: 'Unavailable',
			headline: 'Role relevance needs one observed delivery outcome.',
			limitation: 'Commit activity alone is not presented as product ownership.'
		};
	}
	const typescript = coverage.find((lane) => lane.id === 'typescript')?.state === 'Observed';
	const verification = coverage.find((lane) => lane.id === 'verification')?.state === 'Observed';
	const operations = coverage.find((lane) => lane.id === 'operations')?.state === 'Measured';
	const supportingEvidence = [
		typescript ? 'TypeScript repository evidence' : null,
		verification ? 'a successful same-repository workflow' : null,
		operations ? 'measured account-level runtime operation' : null
	].filter((value): value is string => value !== null);
	return {
		state: 'Inferred',
		headline:
			supportingEvidence.length === 0
				? 'This is an observed product outcome; supporting full-stack lanes remain incomplete.'
				: `This supports a product-oriented full-stack narrative through ${supportingEvidence.join(', ')}.`,
		limitation:
			'Coverage is not a hiring score. Changed-file paths and outcome-to-deployment linkage are not collected, so frontend, backend, and data ownership are not attributed to this artifact.'
	};
}

/** Build one decision-first private accountability review from existing evidence boundaries. */
export function createCareerAccountabilityReview(
	snapshot: GitHubDashboardSnapshot,
	career: CareerSnapshot,
	cloudflare: CloudflareUsageSnapshot | null,
	today: string
): CareerAccountabilityReview {
	const outcome = createOutcome(snapshot);
	const workspace = createCareerAccountabilityView(career, today);
	const coverage = coverageLanes(snapshot, career, cloudflare, outcome);
	return {
		date: today,
		outcome,
		buildCommitment: selectedCommitment(career.commitments, 'Build', today),
		careerCommitment: selectedCommitment(career.commitments, 'Career', today),
		followUpWarnings: workspace.followUpReminders.filter(
			(reminder) => reminder.tone === 'overdue' || reminder.tone === 'today'
		),
		nextFollowUp: workspace.followUpReminders[0] ?? null,
		coverage,
		relevance: relevanceNarrative(outcome, coverage)
	};
}
