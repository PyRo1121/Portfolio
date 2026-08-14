import {
	careerStages,
	type CareerCommitment,
	type CareerOpportunity,
	type CareerSnapshot,
	type CareerStage
} from './career-accountability';
import type { WorkspaceSignal } from './dashboard-navigation';

/** Derived, presentation-ready Career workspace state. */
export type CareerView = {
	readonly columns: ReadonlyArray<{
		readonly stage: CareerStage;
		readonly opportunities: ReadonlyArray<CareerOpportunity>;
	}>;
	readonly nextActions: ReadonlyArray<CareerOpportunity & { readonly overdue: boolean }>;
	readonly openCommitments: ReadonlyArray<CareerCommitment>;
	readonly completedCommitments: ReadonlyArray<CareerCommitment>;
};

/** Derive grouped pipeline and next-action presentation without UI-layer business logic. */
export function createCareerView(snapshot: CareerSnapshot, today: string): CareerView {
	return {
		columns: careerStages.map((stage) => {
			const opportunities = snapshot.opportunities.filter(
				(opportunity) => opportunity.stage === stage
			);
			return { stage, opportunities };
		}),
		nextActions: snapshot.opportunities
			.filter((opportunity) => opportunity.nextAction !== null)
			.sort((left, right) =>
				(left.nextActionDue ?? '9999-12-31').localeCompare(right.nextActionDue ?? '9999-12-31')
			)
			.map((opportunity) => ({
				...opportunity,
				overdue: opportunity.nextActionDue !== null && opportunity.nextActionDue < today
			})),
		openCommitments: snapshot.commitments.filter((commitment) => commitment.status === 'Open'),
		completedCommitments: snapshot.commitments.filter((commitment) => commitment.status === 'Done')
	};
}

/** Return the Career workspace's compact navigation signal. */
export function createCareerNavigationSignal(career: CareerSnapshot | null): WorkspaceSignal {
	return {
		value: career === null ? '—' : String(career.summary.activeOpportunities),
		label: career === null ? 'locked' : 'active',
		tone: career !== null && career.summary.overdueActions > 0 ? 'attention' : 'neutral'
	};
}
