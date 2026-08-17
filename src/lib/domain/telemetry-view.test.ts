import { describe, expect, it } from 'vitest';
import type { TelemetryEvent } from './telemetry';
import { createTelemetryView } from './telemetry-view';

function event(overrides: Partial<TelemetryEvent>): TelemetryEvent {
	return {
		id: 'evt-1',
		ownerEmail: 'olen@latham.cloud',
		eventType: 'page_view',
		recordedAt: '2026-08-17T04:00:00.000Z',
		path: '/',
		workspace: null,
		referrerHost: null,
		country: 'US',
		deviceClass: 'desktop',
		browserFamily: 'chrome',
		viewportWidth: 1440,
		viewportHeight: 900,
		timezoneOffsetMinutes: 240,
		language: 'en',
		metricName: null,
		metricValue: null,
		sessionHash: 'aaa',
		visitHash: 'bbb',
		...overrides
	};
}

describe('createTelemetryView', () => {
	it('aggregates exact page, session, workspace, country, and device totals', () => {
		const now = new Date('2026-08-17T05:00:00Z');
		const events: ReadonlyArray<TelemetryEvent> = [
			event({ id: '1', path: '/', sessionHash: 's1' }),
			event({ id: '2', path: '/about', sessionHash: 's1' }),
			event({ id: '3', path: '/', sessionHash: 's2', country: 'DE', deviceClass: 'mobile' }),
			event({ id: '4', eventType: 'workspace_view', workspace: 'today', sessionHash: 's2' }),
			event({ id: '5', eventType: 'workspace_view', workspace: 'today', sessionHash: 's1' })
		];
		const view = createTelemetryView(events, now);
		expect(view.pageViews).toBe(3);
		expect(view.uniqueSessions).toBe(2);
		expect(view.workspaceViews).toBe(2);
		expect(view.paths[0]).toMatchObject({ label: '/', count: 2 });
		expect(view.workspaces[0]).toMatchObject({ label: 'Today', count: 2 });
		expect(view.countries[0]).toMatchObject({ label: 'US', count: 2 });
		expect(view.devices).toEqual([
			{ label: 'desktop', count: 2, share: 1 },
			{ label: 'mobile', count: 1, share: 0.5 }
		]);
	});

	it('computes median Core Web Vitals from web_vital beacons only', () => {
		const now = new Date('2026-08-17T05:00:00Z');
		const events: ReadonlyArray<TelemetryEvent> = [
			event({
				id: '1',
				eventType: 'web_vital',
				metricName: 'lcp',
				metricValue: 1.2,
				sessionHash: 's1'
			}),
			event({
				id: '2',
				eventType: 'web_vital',
				metricName: 'lcp',
				metricValue: 3.4,
				sessionHash: 's2'
			}),
			event({ id: '3', eventType: 'page_view', path: '/', sessionHash: 's1' })
		];
		const view = createTelemetryView(events, now);
		expect(view.vitals.lcpMs).toBe(2300);
		expect(view.vitals.lcpCount).toBe(2);
		expect(view.vitals.cls).toBeNull();
		expect(view.vitals.clsCount).toBe(0);
	});

	it('orders hour distribution highest first with proportional shares', () => {
		const now = new Date('2026-08-17T05:00:00Z');
		const events: ReadonlyArray<TelemetryEvent> = [
			event({ id: '1', recordedAt: '2026-08-17T04:00:00Z', sessionHash: 's1' }),
			event({ id: '2', recordedAt: '2026-08-17T04:30:00Z', sessionHash: 's2' }),
			event({ id: '3', recordedAt: '2026-08-17T05:00:00Z', sessionHash: 's3' }),
			event({ id: '4', recordedAt: '2026-08-17T03:00:00Z', sessionHash: 's4' })
		];
		const view = createTelemetryView(events, now);
		expect(view.hours[0]).toMatchObject({ label: '04:00', count: 2, share: 1 });
		expect(view.hours[1]).toMatchObject({ label: '05:00', count: 1, share: 0.5 });
		expect(view.hours[2]).toMatchObject({ label: '03:00', count: 1, share: 0.5 });
	});

	it('returns empty aggregates for no events', () => {
		const view = createTelemetryView([], new Date());
		expect(view.pageViews).toBe(0);
		expect(view.uniqueSessions).toBe(0);
		expect(view.paths).toEqual([]);
		expect(view.vitals.lcpMs).toBeNull();
		expect(view.recent).toEqual([]);
	});
});
