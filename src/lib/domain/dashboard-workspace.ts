import type { GitHubDashboardSnapshot, RepositoryIntelligence } from './github-intelligence';

/** Top-level analytical workspaces available in the dashboard. */
export type DashboardWorkspace =
	'today' | 'brief' | 'delivery' | 'craft' | 'repositories' | 'activity' | 'cloudflare';

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
	{ id: 'today', index: 1, label: 'Today', description: 'The viewer-local day', shortcut: '1' },
	{ id: 'brief', index: 2, label: 'Week', description: 'The essential signal', shortcut: '2' },
	{
		id: 'delivery',
		index: 3,
		label: 'Ship',
		description: 'Outcomes and verification',
		shortcut: '3'
	},
	{
		id: 'craft',
		index: 4,
		label: 'Craft',
		description: 'Quality-adjacent evidence',
		shortcut: '4'
	},
	{
		id: 'repositories',
		index: 5,
		label: 'Repos',
		description: 'Inspect the inventory',
		shortcut: '5'
	},
	{
		id: 'activity',
		index: 6,
		label: 'Ledger',
		description: 'Exact commit history',
		shortcut: '6'
	},
	{
		id: 'cloudflare',
		index: 7,
		label: 'Cloudflare',
		description: 'Platform evidence',
		shortcut: '7'
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
