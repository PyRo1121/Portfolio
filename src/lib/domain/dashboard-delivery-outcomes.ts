import type { DeliveryArtifact, GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';

/** Rank retained delivery evidence without promoting workflow runs into outcomes. */
export function deliveryOutcomeRank(artifact: DeliveryArtifact): number {
	if (artifact.kind === 'Release') return artifact.detail.includes('prerelease') ? 1 : 4;
	if (artifact.kind === 'PullRequest') return 3;
	if (artifact.kind === 'Issue') return 2;
	return 0;
}

/** Return shipped outcome artifacts ordered by evidence strength and then recency. */
export function retainedDeliveryOutcomes(
	snapshot: GitHubDashboardSnapshot
): ReadonlyArray<DeliveryArtifact> {
	return [...snapshot.intelligence.delivery.artifacts]
		.filter((artifact) => artifact.status === 'shipped' && artifact.kind !== 'WorkflowRun')
		.sort((left, right) => {
			const rankDelta = deliveryOutcomeRank(right) - deliveryOutcomeRank(left);
			return rankDelta === 0 ? right.occurredAt.localeCompare(left.occurredAt) : rankDelta;
		});
}

/** Select the strongest retained outcome using the documented accountability formula. */
export function strongestRetainedDeliveryOutcome(
	snapshot: GitHubDashboardSnapshot
): DeliveryArtifact | null {
	return retainedDeliveryOutcomes(snapshot)[0] ?? null;
}
