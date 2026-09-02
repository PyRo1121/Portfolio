import type { PublicWorkspace } from './dashboard-workspace';

export type WorkspaceSignal = {
	readonly value: string;
	readonly label: string;
	readonly tone: 'neutral' | 'attention';
};

export type PublicWorkspaceSignals = Readonly<Record<PublicWorkspace, WorkspaceSignal>>;
