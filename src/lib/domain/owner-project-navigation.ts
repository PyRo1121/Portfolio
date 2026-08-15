import type { WorkspaceSignal } from './dashboard-navigation';
import type { OwnerProjectSnapshot } from './owner-project';

/** Derive the Projects navigation signal from the persisted owner registry. */
export function createOwnerProjectNavigationSignal(
	registry: OwnerProjectSnapshot | null
): WorkspaceSignal {
	return registry === null
		? { value: '—', label: 'pending', tone: 'neutral' }
		: { value: String(registry.projects.length), label: 'projects', tone: 'neutral' };
}
