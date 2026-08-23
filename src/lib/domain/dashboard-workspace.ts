/** Top-level analytical workspaces available in either audience. */
export type DashboardWorkspace =
	| 'today'
	| 'brief'
	| 'delivery'
	| 'craft'
	| 'repositories'
	| 'activity'
	| 'briefing'
	| 'cloudflare'
	| 'career'
	| 'telemetry'
	| 'mappings';

/** Public portfolio workspace ids. */
export type PublicWorkspace =
	'today' | 'brief' | 'delivery' | 'craft' | 'repositories' | 'activity';

/** Owner-home workspace ids. Week's `brief` is not reused. */
export type OwnerWorkspace = 'briefing' | 'career' | 'cloudflare' | 'telemetry' | 'mappings';

/** Metadata for one dashboard workspace. */
export type WorkspaceDefinition = {
	readonly id: DashboardWorkspace;
	readonly index: number;
	readonly label: string;
	readonly description: string;
	readonly shortcut: string;
};

const publicList: ReadonlyArray<WorkspaceDefinition> = [
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
		description: 'Pull requests, issues, releases, and workflow runs',
		shortcut: '3'
	},
	{
		id: 'craft',
		index: 4,
		label: 'Checks',
		description: 'Latest workflow state, recovery, history, and change context',
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
	}
];

const ownerList: ReadonlyArray<WorkspaceDefinition> = [
	{
		id: 'briefing',
		index: 1,
		label: 'Briefing',
		description: 'Due work and next action',
		shortcut: '1'
	},
	{
		id: 'career',
		index: 2,
		label: 'Career',
		description: 'Applications, commitments, and interview stories',
		shortcut: '2'
	},
	{
		id: 'cloudflare',
		index: 3,
		label: 'Cloudflare',
		description: 'Resources and measured usage',
		shortcut: '3'
	},
	{
		id: 'telemetry',
		index: 4,
		label: 'Visitors',
		description: 'Visitor telemetry and Core Web Vitals',
		shortcut: '4'
	},
	{
		id: 'mappings',
		index: 5,
		label: 'Mappings',
		description: 'GitHub and Cloudflare project links',
		shortcut: '5'
	}
];

/** Ordered public portfolio workspaces. */
export const publicWorkspaceDefinitions: ReadonlyArray<WorkspaceDefinition> = publicList;

/** Ordered owner-home workspaces. */
export const ownerWorkspaceDefinitions: ReadonlyArray<WorkspaceDefinition> = ownerList;

/** Keyboard shortcut map for one audience list. */
export function shortcutMapFor(
	definitions: ReadonlyArray<WorkspaceDefinition>
): Readonly<Partial<Record<string, DashboardWorkspace>>> {
	return Object.fromEntries(definitions.map((workspace) => [workspace.shortcut, workspace.id]));
}
