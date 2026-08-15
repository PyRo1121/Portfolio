/** Top-level analytical workspaces available in the dashboard. */
export type DashboardWorkspace =
	'today' | 'brief' | 'delivery' | 'craft' | 'repositories' | 'activity' | 'cloudflare' | 'career';

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
		label: 'Projects',
		description: 'Confirmed GitHub and Cloudflare links',
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
