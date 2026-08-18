import type { WorkspaceSignal } from './dashboard-navigation';
import type { OwnerProjectSnapshot } from './owner-project';
import type { PublicShippingProjection } from './owner-project-view';

/** Derive the Projects navigation signal from the persisted owner registry. */
export function createOwnerProjectNavigationSignal(
	registry: OwnerProjectSnapshot | null
): WorkspaceSignal {
	return registry === null
		? { value: '—', label: 'pending', tone: 'neutral' }
		: { value: String(registry.projects.length), label: 'projects', tone: 'neutral' };
}

/** Derive the public Projects rail signal from the shipping-link projection. */
export function createPublicShippingNavigationSignal(
	shipping: PublicShippingProjection
): WorkspaceSignal {
	return shipping._tag === 'Unavailable'
		? { value: '—', label: 'pending', tone: 'neutral' }
		: { value: String(shipping.projects.length), label: 'projects', tone: 'neutral' };
}
