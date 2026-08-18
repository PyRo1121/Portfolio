/** Public `/` stay-alive interval. Matches GitHub snapshot freshness (5 minutes). */
export const PUBLIC_DASHBOARD_STAY_ALIVE_MS = 5 * 60_000;

export type StayAliveDecision =
	| { readonly _tag: 'Idle' }
	| { readonly _tag: 'Reload' }
	| { readonly _tag: 'Wait'; readonly delayMs: number };

/** Decide whether an open dashboard tab should reload, wait, or stay idle. */
export function decideStayAlive(input: {
	readonly nowMs: number;
	readonly lastReloadAtMs: number;
	readonly visible: boolean;
	readonly intervalMs: number;
	readonly reloadInFlight: boolean;
}): StayAliveDecision {
	if (!input.visible || input.reloadInFlight) return { _tag: 'Idle' };
	const elapsedMs = input.nowMs - input.lastReloadAtMs;
	if (elapsedMs >= input.intervalMs) return { _tag: 'Reload' };
	return { _tag: 'Wait', delayMs: input.intervalMs - elapsedMs };
}

export type StayAliveHost = {
	readonly now: () => number;
	readonly isVisible: () => boolean;
	readonly schedule: (callback: () => void, delayMs: number) => () => void;
	readonly reload: () => Promise<void>;
};

export type StayAliveScheduler = {
	readonly start: () => () => void;
	readonly noticeVisibility: () => void;
	readonly markReloaded: () => void;
};

/** Schedule visibility-aware dashboard reloads using a host clock and timer. */
export function createDashboardStayAlive(
	intervalMs: number,
	host: StayAliveHost
): StayAliveScheduler {
	let lastReloadAtMs = host.now();
	let reloadInFlight = false;
	let stopped = true;
	let cancelTimer: (() => void) | null = null;

	const clearTimer = (): void => {
		cancelTimer?.();
		cancelTimer = null;
	};

	const arm = (): void => {
		clearTimer();
		if (stopped) return;
		const decision = decideStayAlive({
			nowMs: host.now(),
			lastReloadAtMs,
			visible: host.isVisible(),
			intervalMs,
			reloadInFlight
		});
		if (decision._tag === 'Idle') return;
		if (decision._tag === 'Wait') {
			cancelTimer = host.schedule(arm, decision.delayMs);
			return;
		}
		reloadInFlight = true;
		void host
			.reload()
			.then(
				() => undefined,
				() => undefined
			)
			.finally(() => {
				reloadInFlight = false;
				lastReloadAtMs = host.now();
				arm();
			});
	};

	return {
		start: (): (() => void) => {
			stopped = false;
			lastReloadAtMs = host.now();
			arm();
			return () => {
				stopped = true;
				clearTimer();
			};
		},
		noticeVisibility: (): void => {
			if (stopped) return;
			arm();
		},
		markReloaded: (): void => {
			lastReloadAtMs = host.now();
			if (stopped || reloadInFlight) return;
			arm();
		}
	};
}
