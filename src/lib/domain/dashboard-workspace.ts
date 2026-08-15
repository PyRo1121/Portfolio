import type { GitHubDashboardSnapshot, RepositoryIntelligence } from './github-intelligence';

/** Top-level analytical workspaces available in the dashboard. */
export type DashboardWorkspace =
	'today' | 'brief' | 'delivery' | 'craft' | 'repositories' | 'activity' | 'cloudflare' | 'career';

/** Repository visibility filters supported by the explorer. */
export type RepositoryFilter = 'all' | 'active' | 'private' | 'public';

/** Metadata for one dashboard workspace. */
export type WorkspaceDefinition = {
	readonly id: DashboardWorkspace;
	readonly index: number;
	readonly label: string;
	readonly description: string;
	readonly shortcut: string;
};

/** Ordered dashboard workspace configuration. */
export const workspaceDefinitions: ReadonlyArray<WorkspaceDefinition> = [
	{
		id: 'today',
		index: 1,
		label: 'Today',
		description: 'Commits for the current local day',
		shortcut: '1'
	},
	{
		id: 'brief',
		index: 2,
		label: 'Week',
		description: 'Activity from the last seven days',
		shortcut: '2'
	},
	{
		id: 'delivery',
		index: 3,
		label: 'Delivery',
		description: 'Pull requests, issues, releases, and checks',
		shortcut: '3'
	},
	{
		id: 'craft',
		index: 4,
		label: 'Quality',
		description: 'Workflow, commit-size, and message data',
		shortcut: '4'
	},
	{
		id: 'repositories',
		index: 5,
		label: 'Repos',
		description: 'Repository list and current activity',
		shortcut: '5'
	},
	{
		id: 'activity',
		index: 6,
		label: 'Commits',
		description: 'Individual commit records',
		shortcut: '6'
	},
	{
		id: 'cloudflare',
		index: 7,
		label: 'Cloudflare',
		description: 'Resources and measured usage',
		shortcut: '7'
	},
	{
		id: 'career',
		index: 8,
		label: 'Career',
		description: 'Applications, commitments, and interview stories',
		shortcut: '8'
	}
];

/** Return a filtered repository list for the explorer. */
export function filterRepositories(
	repositories: ReadonlyArray<RepositoryIntelligence>,
	filter: RepositoryFilter,
	query: string
): ReadonlyArray<RepositoryIntelligence> {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	return repositories.filter((repository) => {
		const matchesFilter =
			filter === 'all' ||
			(filter === 'active' && repository.commits > 0) ||
			(filter === 'private' && repository.isPrivate) ||
			(filter === 'public' && !repository.isPrivate);
		const matchesQuery =
			normalizedQuery.length === 0 ||
			repository.name.toLocaleLowerCase().includes(normalizedQuery) ||
			repository.description.toLocaleLowerCase().includes(normalizedQuery) ||
			repository.primaryLanguage.toLocaleLowerCase().includes(normalizedQuery);
		return matchesFilter && matchesQuery;
	});
}

/** Resolve one selected repository, falling back to the most active repository. */
export function resolveSelectedRepository(
	snapshot: GitHubDashboardSnapshot,
	selectedFullName: string | null
): RepositoryIntelligence | null {
	return (
		snapshot.intelligence.repositories.find(
			(repository) => repository.fullName === selectedFullName
		) ??
		snapshot.intelligence.repositories[0] ??
		null
	);
}
