/** Telemetry event kinds collected from the public dashboard. */
export type TelemetryEventType =
	'page_view' | 'workspace_view' | 'web_vital' | 'error' | 'contact_action' | 'portfolio_action';

/** Device class inferred from the client user agent. */
export type TelemetryDeviceClass = 'mobile' | 'tablet' | 'desktop';

/** Browser metric names accepted from the public telemetry client. */
export type TelemetryVitalMetric = 'lcp' | 'fcp' | 'ttfb' | 'inp' | 'cls';

/** Exact public contact action recorded without message or identity data. */
export type ContactAction =
	| 'email_header'
	| 'email_social'
	| 'email_summary'
	| 'email_about'
	| 'linkedin_social'
	| 'linkedin_summary'
	| 'linkedin_about';

/** Exact portfolio navigation action recorded without visitor identity or content. */
export type PortfolioAction = 'featured_omg_open' | 'featured_weeknote_open' | 'live_evidence_open';

/** Exclude Access-protected owner pages from public visitor analytics. */
export function shouldCollectTelemetryPath(path: string): boolean {
	return path !== '/owner' && path.startsWith('/owner/') === false;
}

/** One persisted telemetry row after server enrichment. */
export type TelemetryEvent = {
	readonly id: string;
	readonly ownerEmail: string;
	readonly eventType: TelemetryEventType;
	readonly recordedAt: string;
	readonly path: string;
	readonly workspace: string | null;
	readonly referrerHost: string | null;
	readonly country: string | null;
	readonly deviceClass: string | null;
	readonly browserFamily: string | null;
	readonly viewportWidth: number | null;
	readonly viewportHeight: number | null;
	readonly timezoneOffsetMinutes: number | null;
	readonly language: string | null;
	readonly metricName: string | null;
	readonly metricValue: number | null;
	readonly sessionHash: string | null;
	readonly visitHash: string | null;
};
