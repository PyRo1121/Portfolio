import { describe, expect, it } from 'vitest';
import {
	telemetryEventFromRow,
	telemetryRetentionQuery,
	telemetryTotalsFromRow
} from './telemetry-store.js';

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
	it('maps complete retention-window totals from a SQL aggregate row', () => {
		expect(
			telemetryTotalsFromRow({
				total_events: 5_002,
				page_views: 2_400,
				workspace_views: 1_200,
				unique_sessions: 800,
				page_view_sessions: 750,
				performance_sessions: 600,
				contact_actions: 14,
				contact_sessions: 9,
				email_clicks: 10,
				linkedin_clicks: 4,
				portfolio_actions: 21,
				portfolio_sessions: 13,
				featured_omg_opens: 7,
				featured_weeknote_opens: 8,
				live_evidence_opens: 6,
				error_count: 12,
				last_recorded_at: '2026-08-17T05:00:00.000Z'
			})
		).toEqual({
			totalEvents: 5_002,
			pageViews: 2_400,
			workspaceViews: 1_200,
			uniqueSessions: 800,
			pageViewSessions: 750,
			performanceSessions: 600,
			contactActions: 14,
			contactSessions: 9,
			emailClicks: 10,
			linkedinClicks: 4,
			portfolioActions: 21,
			portfolioSessions: 13,
			featuredOmgOpens: 7,
			featuredWeeknoteOpens: 8,
			liveEvidenceOpens: 6,
			errorCount: 12,
			lastRecordedAt: '2026-08-17T05:00:00.000Z'
		});
	});

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

	it('maps a contact action without identity or message content', () => {
		expect(
			telemetryEventFromRow({
				id: 'tele-contact',
				owner_email: 'olen@latham.cloud',
				event_type: 'contact_action',
				recorded_at: '2026-08-17T04:00:00.000Z',
				path: '/',
				workspace: null,
				referrer_host: null,
				country: 'US',
				device_class: 'mobile',
				browser_family: 'safari',
				viewport_width: 390,
				viewport_height: 844,
				timezone_offset_minutes: 240,
				language: 'en',
				metric_name: 'email_summary',
				metric_value: 1,
				session_hash: 's1',
				visit_hash: null
			})
		).toMatchObject({ eventType: 'contact_action', metricName: 'email_summary', metricValue: 1 });
	});

	it('maps a portfolio action without identity or content', () => {
		expect(
			telemetryEventFromRow({
				id: 'tele-portfolio-action',
				owner_email: 'olen@latham.cloud',
				event_type: 'portfolio_action',
				recorded_at: '2026-08-17T04:00:00.000Z',
				path: '/',
				workspace: null,
				referrer_host: null,
				country: 'US',
				device_class: 'desktop',
				browser_family: 'chromium',
				viewport_width: 1440,
				viewport_height: 900,
				timezone_offset_minutes: 300,
				language: 'en',
				metric_name: 'featured_weeknote_open',
				metric_value: 1,
				session_hash: 's1',
				visit_hash: null
			})
		).toMatchObject({
			eventType: 'portfolio_action',
			metricName: 'featured_weeknote_open',
			metricValue: 1
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
