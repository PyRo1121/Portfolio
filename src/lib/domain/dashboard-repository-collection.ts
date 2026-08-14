import type {
	GitHubDashboardSnapshot,
	RepositoryCollectionEvidence
} from '$lib/domain/github-intelligence';

/** Project repository collection evidence through a stable presentation boundary. */
export function repositoryCollectionEvidence(
	snapshot: GitHubDashboardSnapshot
): RepositoryCollectionEvidence {
	return snapshot.intelligence.repositoryCollection;
}
