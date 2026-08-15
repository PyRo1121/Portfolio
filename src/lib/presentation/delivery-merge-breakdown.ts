import type { DeliveryIntelligence } from '$lib/domain/github-intelligence';

export type DeliveryMergeBreakdown = {
	readonly authored: number;
	readonly maintainer: number;
	readonly automated: number;
	readonly truncated: boolean;
};

/** Expose explicit PR responsibility categories without conflating authorship and maintenance. */
export function deliveryMergeBreakdown(delivery: DeliveryIntelligence): DeliveryMergeBreakdown {
	return {
		authored: delivery.authoredMergedPullRequests,
		maintainer: delivery.maintainerMergedPullRequests,
		automated: delivery.automatedMergedPullRequests,
		truncated: delivery.mergedPullRequestsTruncated
	};
}
