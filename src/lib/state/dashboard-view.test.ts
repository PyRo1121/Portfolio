import { describe, expect, it } from 'vitest';
import { DashboardView } from './dashboard-view.svelte';

describe('DashboardView.refresh', () => {
	it('surfaces a rejected refresh operation and restores interactivity', async () => {
		const view = new DashboardView({ initialWorkspace: 'today', shortcuts: {} });
		view.refresh(() => Promise.reject(new Error('network unavailable')));
		expect(view.isRefreshing).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(view.isRefreshing).toBe(false);
		expect(view.refreshError).toBe('Refresh failed. The previous evidence remains available.');
	});
});
