import { describe, expect, it } from 'vitest';
import {
	createDashboardStayAlive,
	decideStayAlive,
	PUBLIC_DASHBOARD_STAY_ALIVE_MS
} from './dashboard-stay-alive';

const intervalMs = PUBLIC_DASHBOARD_STAY_ALIVE_MS;

describe('decideStayAlive', () => {
	it('waits the remaining interval while the tab is visible and the snapshot is still fresh', () => {
		expect(
			decideStayAlive({
				nowMs: 4 * 60_000,
				lastReloadAtMs: 0,
				visible: true,
				intervalMs,
				reloadInFlight: false
			})
		).toEqual({ _tag: 'Wait', delayMs: 60_000 });
	});

	it('reloads when the visible tab has reached the stay-alive interval', () => {
		expect(
			decideStayAlive({
				nowMs: intervalMs,
				lastReloadAtMs: 0,
				visible: true,
				intervalMs,
				reloadInFlight: false
			})
		).toEqual({ _tag: 'Reload' });
	});

	it('idles while the tab is hidden even if the interval has elapsed', () => {
		expect(
			decideStayAlive({
				nowMs: intervalMs * 2,
				lastReloadAtMs: 0,
				visible: false,
				intervalMs,
				reloadInFlight: false
			})
		).toEqual({ _tag: 'Idle' });
	});

	it('idles while a reload is already in flight', () => {
		expect(
			decideStayAlive({
				nowMs: intervalMs * 2,
				lastReloadAtMs: 0,
				visible: true,
				intervalMs,
				reloadInFlight: true
			})
		).toEqual({ _tag: 'Idle' });
	});
});

describe('createDashboardStayAlive', () => {
	it('does not reload on start, then reloads once the visible interval elapses', async () => {
		const host = createStayAliveTestHost({ visible: true });
		const stayAlive = createDashboardStayAlive(intervalMs, host);
		const stop = stayAlive.start();

		expect(host.reloads).toBe(0);
		expect(host.pendingDelayMs()).toBe(intervalMs);

		host.advance(intervalMs);
		await host.flushReload();
		expect(host.reloads).toBe(1);

		stop();
	});

	it('does not poll while hidden and reloads immediately when the overdue tab becomes visible', async () => {
		const host = createStayAliveTestHost({ visible: false });
		const stayAlive = createDashboardStayAlive(intervalMs, host);
		stayAlive.start();

		expect(host.pendingDelayMs()).toBeNull();
		host.advance(intervalMs * 2);
		expect(host.reloads).toBe(0);

		host.visible = true;
		stayAlive.noticeVisibility();
		await host.flushReload();
		expect(host.reloads).toBe(1);
	});

	it('cancels the timer when the tab hides and waits only the remaining interval after return', () => {
		const host = createStayAliveTestHost({ visible: true });
		const stayAlive = createDashboardStayAlive(intervalMs, host);
		stayAlive.start();

		host.advance(60_000);
		host.visible = false;
		stayAlive.noticeVisibility();
		expect(host.pendingDelayMs()).toBeNull();

		host.advance(30_000);
		host.visible = true;
		stayAlive.noticeVisibility();
		expect(host.pendingDelayMs()).toBe(intervalMs - 90_000);
		expect(host.reloads).toBe(0);
	});

	it('treats a failed reload as an attempt and waits the next interval', async () => {
		const host = createStayAliveTestHost({ visible: true, reloadFails: true });
		const stayAlive = createDashboardStayAlive(intervalMs, host);
		stayAlive.start();
		host.advance(intervalMs);
		await host.flushReload();
		expect(host.reloads).toBe(1);
		expect(host.pendingDelayMs()).toBe(intervalMs);
	});
});

function createStayAliveTestHost(options: {
	readonly visible: boolean;
	readonly reloadFails?: boolean;
}) {
	let nowMs = 0;
	let pending: { readonly delayMs: number; readonly fire: () => void } | null = null;
	let settleReload: (() => void) | null = null;
	const host = {
		visible: options.visible,
		reloads: 0,
		now: (): number => nowMs,
		isVisible: (): boolean => host.visible,
		schedule: (callback: () => void, delayMs: number): (() => void) => {
			pending = { delayMs, fire: callback };
			return () => {
				pending = null;
			};
		},
		reload: (): Promise<void> => {
			host.reloads += 1;
			return new Promise<void>((resolve, reject) => {
				settleReload = () => {
					if (options.reloadFails === true) reject(new Error('reload failed'));
					else resolve();
				};
			});
		},
		pendingDelayMs: (): number | null => pending?.delayMs ?? null,
		advance: (deltaMs: number): void => {
			nowMs += deltaMs;
			const current = pending;
			if (current === null || current.delayMs > deltaMs) return;
			pending = null;
			current.fire();
		},
		flushReload: async (): Promise<void> => {
			const settle = settleReload;
			settleReload = null;
			settle?.();
			await Promise.resolve();
			await Promise.resolve();
		}
	};
	return host;
}
