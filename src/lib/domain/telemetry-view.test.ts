import { describe, expect, it } from 'vitest';
import type { TelemetryEvent } from './telemetry';
import { createTelemetryView, type TelemetryTotals } from './telemetry-view';

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

function totals(overrides: Partial<TelemetryTotals> = {}): TelemetryTotals {
	return {
		totalEvents: 0,
		pageViews: 0,
		workspaceViews: 0,
		uniqueSessions: 0,
		pageViewSessions: 0,
		performanceSessions: 0,
		errorCount: 0,
		lastRecordedAt: null,
		...overrides
	};
}

describe('createTelemetryView', () => {
	it('aggregates exact page, session, workspace, country, and device totals', () => {
		const events: ReadonlyArray<TelemetryEvent> = [
			event({ id: '1', path: '/', sessionHash: 's1' }),
			event({ id: '2', path: '/about', sessionHash: 's1' }),
			event({ id: '3', path: '/', sessionHash: 's2', country: 'DE', deviceClass: 'mobile' }),
			event({ id: '4', eventType: 'workspace_view', workspace: 'today', sessionHash: 's2' }),
			event({ id: '5', eventType: 'workspace_view', workspace: 'today', sessionHash: 's1' })
		];
		const view = createTelemetryView(
			events,
			totals({
				totalEvents: 5,
				pageViews: 3,
				workspaceViews: 2,
				uniqueSessions: 2,
				pageViewSessions: 2,
				lastRecordedAt: '2026-08-17T04:00:00.000Z'
			})
		);
		expect(view.pageViews).toBe(3);
		expect(view.pageViewSessions).toBe(2);
		expect(view.performanceSessions).toBe(0);
		expect(view.performanceCoveragePercent).toBe(0);
		expect(view.errorCount).toBe(0);
		expect(view.uniqueSessions).toBe(2);
		expect(view.workspaceViews).toBe(2);
		expect(view.paths[0]).toMatchObject({ label: '/', count: 2 });
		expect(view.workspaces[0]).toMatchObject({ label: 'Today', count: 2 });
		expect(view.countries[0]).toMatchObject({ label: 'US', count: 2 });
		expect(view.devices).toEqual([
			{ label: 'desktop', count: 2, share: 1 },
			{ label: 'mobile', count: 1, share: 0.5 }
		]);
		expect(view.referrers[0]).toMatchObject({ label: 'Direct / none', count: 3 });
	});

	it('computes median Core Web Vitals from web_vital beacons only', () => {
		const events: ReadonlyArray<TelemetryEvent> = [
			event({
				id: '1',
				eventType: 'web_vital',
				metricName: 'lcp',
				metricValue: 1200,
				sessionHash: 's1'
			}),
			event({
				id: '2',
				eventType: 'web_vital',
				metricName: 'lcp',
				metricValue: 3400,
				sessionHash: 's2'
			}),
			event({ id: '3', eventType: 'page_view', path: '/', sessionHash: 's1' })
		];
		const view = createTelemetryView(
			events,
			totals({
				totalEvents: 3,
				pageViews: 1,
				uniqueSessions: 2,
				pageViewSessions: 1,
				performanceSessions: 2,
				lastRecordedAt: '2026-08-17T04:00:00.000Z'
			})
		);
		expect(view.vitals.lcpMs).toBe(2300);
		expect(view.vitals.lcpCount).toBe(2);
		expect(view.performanceSessions).toBe(2);
		expect(view.performanceCoveragePercent).toBe(100);
		expect(view.vitals.cls).toBeNull();
		expect(view.vitals.clsCount).toBe(0);
	});

	it('orders hour distribution highest first with proportional shares', () => {
		const events: ReadonlyArray<TelemetryEvent> = [
			event({ id: '1', recordedAt: '2026-08-17T04:00:00Z', sessionHash: 's1' }),
			event({ id: '2', recordedAt: '2026-08-17T04:30:00Z', sessionHash: 's2' }),
			event({ id: '3', recordedAt: '2026-08-17T05:00:00Z', sessionHash: 's3' }),
			event({ id: '4', recordedAt: '2026-08-17T03:00:00Z', sessionHash: 's4' })
		];
		const view = createTelemetryView(
			events,
			totals({
				totalEvents: 4,
				pageViews: 4,
				uniqueSessions: 4,
				pageViewSessions: 4,
				lastRecordedAt: '2026-08-17T05:00:00.000Z'
			})
		);
		expect(view.hours[0]).toMatchObject({ label: '04:00', count: 2, share: 1 });
		expect(view.hours[1]).toMatchObject({ label: '05:00', count: 1, share: 0.5 });
		expect(view.hours[2]).toMatchObject({ label: '03:00', count: 1, share: 0.5 });
	});

	it('uses complete SQL totals when detailed events are bounded', () => {
		const view = createTelemetryView(
			[event({ id: 'latest', sessionHash: 'sample-session' })],
			{
				totalEvents: 5_001,
				pageViews: 2_400,
				workspaceViews: 1_200,
				uniqueSessions: 800,
				pageViewSessions: 750,
				performanceSessions: 600,
				errorCount: 12,
				lastRecordedAt: '2026-08-17T05:00:00.000Z'
			},
			true
		);
		expect(view.totalEvents).toBe(5_001);
		expect(view.pageViews).toBe(2_400);
		expect(view.uniqueSessions).toBe(800);
		expect(view.performanceCoveragePercent).toBe(80);
		expect(view.errorCount).toBe(12);
		expect(view.lastRecordedAt).toBe('2026-08-17T05:00:00.000Z');
		expect(view.detailsTruncated).toBe(true);
		expect(view.recent).toHaveLength(1);
	});

	it('returns empty aggregates for no events', () => {
		const view = createTelemetryView([], totals());
		expect(view.pageViews).toBe(0);
		expect(view.pageViewSessions).toBe(0);
		expect(view.performanceSessions).toBe(0);
		expect(view.performanceCoveragePercent).toBeNull();
		expect(view.errorCount).toBe(0);
		expect(view.uniqueSessions).toBe(0);
		expect(view.paths).toEqual([]);
		expect(view.vitals.lcpMs).toBeNull();
		expect(view.recent).toEqual([]);
	});
});
