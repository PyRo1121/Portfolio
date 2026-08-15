import type { DeliveryIntelligence } from '$lib/domain/github-intelligence';

export type DeliveryIssueBreakdown = {
	readonly authored: number;
	readonly closedByYou: number;
	readonly viaPullRequest: number;
	readonly truncated: boolean;
};

/** Expose the exact ways closed issues became the owner's delivery responsibility. */
export function deliveryIssueBreakdown(delivery: DeliveryIntelligence): DeliveryIssueBreakdown {
	return {
		authored: delivery.authoredClosedIssues,
		closedByYou: delivery.ownerClosedIssues,
		viaPullRequest: delivery.pullRequestClosedIssues,
		truncated: delivery.closedIssuesTruncated
	};
}
