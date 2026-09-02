import type { ClientTelemetry } from './client-telemetry';

let instance: ClientTelemetry | null = null;
let loading: Promise<ClientTelemetry | null> | null = null;

/**
 * Load the telemetry collector off the critical path. The module pulls in
 * web-vitals and its observers, so it must not evaluate during page load.
 */
export function loadClientTelemetry(): Promise<ClientTelemetry | null> {
	if (typeof window === 'undefined') return Promise.resolve(null);
	loading ??= new Promise((resolve) => {
		const start = (): void => {
			import('./client-telemetry')
				.then((module) => {
					instance = module.getClientTelemetry();
					resolve(instance);
				})
				.catch(() => {
					resolve(null);
				});
		};
		if ('requestIdleCallback' in globalThis) {
			requestIdleCallback(start, { timeout: 3_000 });
		} else {
			setTimeout(start, 1);
		}
	});
	return loading;
}

/** Return the collector when it has finished loading, else null. */
export function getLoadedClientTelemetry(): ClientTelemetry | null {
	return instance;
}
