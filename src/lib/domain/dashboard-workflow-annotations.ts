import type {
	GitHubDashboardSnapshot,
	WorkflowAnnotationCoverageInput
} from '$lib/domain/github-intelligence';

/** Project bounded workflow annotation evidence through a stable presentation boundary. */
export function workflowAnnotationCoverage(
	snapshot: GitHubDashboardSnapshot
): WorkflowAnnotationCoverageInput {
	return snapshot.intelligence.delivery.workflows.current.annotations;
}
