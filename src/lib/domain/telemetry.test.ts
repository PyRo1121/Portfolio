import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { TelemetryPayloadSchema } from './telemetry-schema';
import { shouldCollectTelemetryPath } from './telemetry';

const common = {
	eventId: 'f8ad3bc4-8b70-4d2c-88aa-0efb3710378f',
	path: '/',
	sessionHash: '0123456789abcdef0123456789abcdef'
};

function decodes(input: unknown): boolean {
	return Either.isRight(Schema.decodeUnknownEither(TelemetryPayloadSchema)(input));
}

describe('shouldCollectTelemetryPath', () => {
	it('excludes the Access-protected owner surface from visitor analytics', () => {
		expect(shouldCollectTelemetryPath('/')).toBe(true);
		expect(shouldCollectTelemetryPath('/about')).toBe(true);
		expect(shouldCollectTelemetryPath('/owner')).toBe(false);
		expect(shouldCollectTelemetryPath('/owner/')).toBe(false);
	});
});

describe('TelemetryPayloadSchema', () => {
	it('parses each event variant with only its meaningful evidence', () => {
		expect(decodes({ ...common, eventType: 'page_view', referrerHost: 'github.com' })).toBe(true);
		expect(decodes({ ...common, eventType: 'workspace_view', workspace: 'projects' })).toBe(true);
		expect(
			decodes({ ...common, eventType: 'web_vital', metricName: 'lcp', metricValue: 2_950 })
		).toBe(true);
		expect(
			decodes({ ...common, eventType: 'error', metricName: 'runtime_error', metricValue: 1 })
		).toBe(true);
		expect(decodes({ ...common, eventType: 'contact_action', action: 'email_summary' })).toBe(true);
		expect(decodes({ ...common, eventType: 'portfolio_action', action: 'featured_omg_open' })).toBe(
			true
		);
	});

	it('rejects missing event-specific evidence and invalid paths', () => {
		expect(decodes({ ...common, eventType: 'workspace_view' })).toBe(false);
		expect(decodes({ ...common, eventType: 'web_vital', metricName: 'lcp' })).toBe(false);
		expect(decodes({ ...common, eventType: 'contact_action' })).toBe(false);
		expect(decodes({ ...common, eventType: 'contact_action', action: 'schedule_interview' })).toBe(
			false
		);
		expect(decodes({ ...common, eventType: 'portfolio_action' })).toBe(false);
		expect(
			decodes({ ...common, eventType: 'portfolio_action', action: 'unknown_destination' })
		).toBe(false);
		expect(decodes({ ...common, eventType: 'page_view', path: '' })).toBe(false);
		expect(decodes({ ...common, eventType: 'page_view', path: 'https://example.com/' })).toBe(
			false
		);
	});

	it('bounds browser and performance measurements', () => {
		expect(decodes({ ...common, eventType: 'web_vital', metricName: 'lcp', metricValue: -1 })).toBe(
			false
		);
		expect(
			decodes({ ...common, eventType: 'web_vital', metricName: 'lcp', metricValue: 120_001 })
		).toBe(false);
		expect(
			decodes({ ...common, eventType: 'web_vital', metricName: 'cls', metricValue: 10.001 })
		).toBe(false);
		expect(decodes({ ...common, eventType: 'page_view', viewportWidth: 100_000 })).toBe(false);
		expect(decodes({ ...common, eventType: 'page_view', timezoneOffsetMinutes: 2_000 })).toBe(
			false
		);
	});
});
