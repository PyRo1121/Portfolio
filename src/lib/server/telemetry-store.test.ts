import { describe, expect, it } from 'vitest';
import { telemetryRetentionQuery, telemetryEventFromRow } from './telemetry-store';

describe('telemetry retention', () => {
	it('deletes only owner-scoped rows older than the reporting window', () => {
		const query = telemetryRetentionQuery(
			'olen@latham.cloud',
			new Date('2026-07-18T00:00:00.000Z')
		);
		expect(query.sql).toContain('DELETE FROM telemetry_events');
		expect(query.sql).toContain('owner_email = ? AND recorded_at < ?');
		expect(query.binds).toEqual(['olen@latham.cloud', '2026-07-18T00:00:00.000Z']);
	});
});

describe('telemetry D1 row mapping', () => {
	it('preserves the full beacon evidence with nulls intact', () => {
		expect(
			telemetryEventFromRow({
				id: 'tele-1',
				owner_email: 'olen@latham.cloud',
				event_type: 'page_view',
				recorded_at: '2026-08-17T04:00:00.000Z',
				path: '/about',
				workspace: null,
				referrer_host: 'github.com',
				country: 'US',
				device_class: 'mobile',
				browser_family: 'safari',
				viewport_width: 390,
				viewport_height: 844,
				timezone_offset_minutes: 240,
				language: 'en',
				metric_name: null,
				metric_value: null,
				session_hash: 's1',
				visit_hash: 'v1'
			})
		).toEqual({
			id: 'tele-1',
			ownerEmail: 'olen@latham.cloud',
			eventType: 'page_view',
			recordedAt: '2026-08-17T04:00:00.000Z',
			path: '/about',
			workspace: null,
			referrerHost: 'github.com',
			country: 'US',
			deviceClass: 'mobile',
			browserFamily: 'safari',
			viewportWidth: 390,
			viewportHeight: 844,
			timezoneOffsetMinutes: 240,
			language: 'en',
			metricName: null,
			metricValue: null,
			sessionHash: 's1',
			visitHash: 'v1'
		});
	});

	it('maps a web_vital beacon metric', () => {
		expect(
			telemetryEventFromRow({
				id: 'tele-2',
				owner_email: 'olen@latham.cloud',
				event_type: 'web_vital',
				recorded_at: '2026-08-17T04:00:00.000Z',
				path: '/',
				workspace: null,
				referrer_host: null,
				country: null,
				device_class: null,
				browser_family: null,
				viewport_width: null,
				viewport_height: null,
				timezone_offset_minutes: null,
				language: null,
				metric_name: 'lcp',
				metric_value: 1.25,
				session_hash: 's1',
				visit_hash: 'v1'
			}).metricName
		).toBe('lcp');
		expect(
			telemetryEventFromRow({
				id: 'tele-2',
				owner_email: 'olen@latham.cloud',
				event_type: 'web_vital',
				recorded_at: '2026-08-17T04:00:00.000Z',
				path: '/',
				workspace: null,
				referrer_host: null,
				country: null,
				device_class: null,
				browser_family: null,
				viewport_width: null,
				viewport_height: null,
				timezone_offset_minutes: null,
				language: null,
				metric_name: 'lcp',
				metric_value: 1.25,
				session_hash: 's1',
				visit_hash: 'v1'
			}).metricValue
		).toBe(1.25);
	});
});
