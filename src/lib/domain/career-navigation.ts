import type { CareerSnapshot } from './career-accountability';
import type { WorkspaceSignal } from './dashboard-navigation';

/** Return the Career workspace's compact navigation signal. */
export function createCareerNavigationSignal(
	career: CareerSnapshot | null,
	today: string
): WorkspaceSignal {
	const hasOverdueFollowUp = career?.opportunities.some(
		(opportunity) =>
			opportunity.nextActionDue !== null &&
			opportunity.nextActionDue < today &&
			opportunity.stage !== 'Closed'
	);
	return {
		value: career === null ? '—' : String(career.summary.activeOpportunities),
		label: career === null ? 'locked' : 'active',
		tone: hasOverdueFollowUp === true ? 'attention' : 'neutral'
	};
}
