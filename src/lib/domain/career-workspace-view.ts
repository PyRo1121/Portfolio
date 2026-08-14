import {
	careerStages,
	type CareerCommitment,
	type CareerOpportunity,
	type CareerSnapshot,
	type CareerStage
} from './career-accountability';

/** One dashboard-local follow-up reminder derived from an opportunity action and due date. */
export type CareerFollowUpReminder = {
	readonly opportunityId: string;
	readonly company: string;
	readonly action: string;
	readonly dueOn: string | null;
	readonly label: string;
	readonly tone: 'overdue' | 'today' | 'upcoming' | 'unscheduled';
};

/** Derived, presentation-ready Career workspace state. */
export type CareerAccountabilityView = {
	readonly columns: ReadonlyArray<{
		readonly stage: CareerStage;
		readonly opportunities: ReadonlyArray<CareerOpportunity>;
	}>;
	readonly followUpReminders: ReadonlyArray<CareerFollowUpReminder>;
	readonly overdueFollowUps: number;
	readonly openCommitments: ReadonlyArray<CareerCommitment>;
	readonly completedCommitments: ReadonlyArray<CareerCommitment>;
};

const DAY_IN_MILLISECONDS = 86_400_000;

function dateDeltaInDays(dueOn: string | null, today: string): number | null {
	if (dueOn === null) return null;
	const dueTimestamp = Date.parse(`${dueOn}T00:00:00.000Z`);
	const todayTimestamp = Date.parse(`${today}T00:00:00.000Z`);
	return Number.isFinite(dueTimestamp) && Number.isFinite(todayTimestamp)
		? Math.round((dueTimestamp - todayTimestamp) / DAY_IN_MILLISECONDS)
		: null;
}

function reminderPresentation(
	dueOn: string | null,
	today: string
): Pick<CareerFollowUpReminder, 'label' | 'tone'> {
	const daysUntilDue = dateDeltaInDays(dueOn, today);
	if (daysUntilDue === null) return { label: 'Needs date', tone: 'unscheduled' };
	if (daysUntilDue < 0) {
		return { label: `${Math.abs(daysUntilDue)}d overdue`, tone: 'overdue' };
	}
	if (daysUntilDue === 0) return { label: 'Due today', tone: 'today' };
	if (daysUntilDue === 1) return { label: 'Due tomorrow', tone: 'upcoming' };
	return { label: `Due in ${daysUntilDue}d`, tone: 'upcoming' };
}

/** Derive grouped pipeline and dashboard-local follow-up reminders without UI business logic. */
export function createCareerAccountabilityView(
	snapshot: CareerSnapshot,
	today: string
): CareerAccountabilityView {
	const followUps = snapshot.opportunities
		.filter((opportunity) => opportunity.nextAction !== null && opportunity.stage !== 'Closed')
		.sort((left, right) =>
			(left.nextActionDue ?? '9999-12-31').localeCompare(right.nextActionDue ?? '9999-12-31')
		);
	const followUpReminders = followUps.map((opportunity) => ({
		opportunityId: opportunity.id,
		company: opportunity.company,
		action: opportunity.nextAction ?? '',
		dueOn: opportunity.nextActionDue,
		...reminderPresentation(opportunity.nextActionDue, today)
	}));
	return {
		columns: careerStages.map((stage) => {
			const opportunities = snapshot.opportunities.filter(
				(opportunity) => opportunity.stage === stage
			);
			return { stage, opportunities };
		}),
		followUpReminders,
		overdueFollowUps: followUpReminders.filter((reminder) => reminder.tone === 'overdue').length,
		openCommitments: snapshot.commitments.filter((commitment) => commitment.status === 'Open'),
		completedCommitments: snapshot.commitments.filter((commitment) => commitment.status === 'Done')
	};
}
