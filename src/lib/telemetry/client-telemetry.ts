import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import {
	shouldCollectTelemetryPath,
	type ContactAction,
	type PortfolioAction,
	type TelemetryDeviceClass,
	type TelemetryEventType
} from '$lib/domain/telemetry';

type VitalMetric = 'lcp' | 'fcp' | 'ttfb' | 'inp' | 'cls';
type TelemetryValue = string | number | undefined;

/**
 * Visitor telemetry collector. Sends page, navigation, and browser-performance
 * evidence without cookies or raw IP addresses. Core Web Vitals use the
 * maintained browser reference implementation rather than custom aggregation.
 */
let sharedClientTelemetry: ClientTelemetry | null = null;

/** Return the one browser telemetry collector shared by the layout and dashboard. */
export function getClientTelemetry(): ClientTelemetry | null {
	if (typeof window === 'undefined') return null;
	sharedClientTelemetry ??= new ClientTelemetry();
	return sharedClientTelemetry;
}

export class ClientTelemetry {
	readonly #sessionHash = randomHex(16);
	readonly #deviceClass = detectDeviceClass();
	readonly #browserFamily = detectBrowserFamily();
	readonly #viewportWidth = window.innerWidth;
	readonly #viewportHeight = window.innerHeight;
	readonly #timezoneOffsetMinutes = new Date().getTimezoneOffset();
	readonly #language = navigator.language;
	readonly #initialReferrerHost = referrerHost();
	readonly #sentVitals = new Set<VitalMetric>();
	#currentPath: string | null = null;
	#vitalsPath: string | null = null;

	constructor() {
		this.#observeWebVitals();
		window.addEventListener('error', () => this.#sendError('runtime_error'));
		window.addEventListener('unhandledrejection', () => this.#sendError('unhandled_rejection'));
	}

	/** Record one page, including client-side route changes. */
	recordPage(path: string): void {
		if (this.#currentPath === path) return;
		const initialPage = this.#currentPath === null;
		this.#currentPath = path;
		this.#vitalsPath ??= path;
		this.#send('page_view', {
			path,
			referrerHost: initialPage ? this.#initialReferrerHost : undefined,
			deviceClass: this.#deviceClass,
			browserFamily: this.#browserFamily,
			viewportWidth: this.#viewportWidth,
			viewportHeight: this.#viewportHeight,
			timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
			language: this.#language
		});
	}

	/** Record one dashboard workspace navigation event. */
	recordWorkspace(workspace: string): void {
		this.#send('workspace_view', {
			path: this.#currentPath ?? window.location.pathname,
			workspace,
			deviceClass: this.#deviceClass,
			browserFamily: this.#browserFamily,
			viewportWidth: this.#viewportWidth,
			viewportHeight: this.#viewportHeight,
			timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
			language: this.#language
		});
	}

	/** Record one explicit recruiter contact action without contact or message content. */
	recordContact(action: ContactAction): void {
		this.#send('contact_action', {
			path: this.#currentPath ?? window.location.pathname,
			action,
			deviceClass: this.#deviceClass,
			browserFamily: this.#browserFamily,
			viewportWidth: this.#viewportWidth,
			viewportHeight: this.#viewportHeight,
			timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
			language: this.#language
		});
	}

	/** Record one portfolio destination chosen without content or visitor identity. */
	recordPortfolioAction(action: PortfolioAction): void {
		this.#send('portfolio_action', {
			path: this.#currentPath ?? window.location.pathname,
			action,
			deviceClass: this.#deviceClass,
			browserFamily: this.#browserFamily,
			viewportWidth: this.#viewportWidth,
			viewportHeight: this.#viewportHeight,
			timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
			language: this.#language
		});
	}

	#observeWebVitals(): void {
		onCLS((metric) => this.#recordVital('cls', metric.value));
		onFCP((metric) => this.#recordVital('fcp', metric.value));
		onINP((metric) => this.#recordVital('inp', metric.value));
		onLCP((metric) => this.#recordVital('lcp', metric.value));
		onTTFB((metric) => this.#recordVital('ttfb', metric.value));
	}

	#sendError(metricName: string): void {
		this.#send('error', {
			path: this.#currentPath ?? window.location.pathname,
			metricName,
			metricValue: 1,
			deviceClass: this.#deviceClass,
			browserFamily: this.#browserFamily,
			viewportWidth: this.#viewportWidth,
			viewportHeight: this.#viewportHeight,
			timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
			language: this.#language
		});
	}

	#recordVital(metric: VitalMetric, value: number): void {
		if (this.#sentVitals.has(metric)) return;
		this.#sentVitals.add(metric);
		this.#send('web_vital', {
			path: this.#vitalsPath ?? this.#currentPath ?? window.location.pathname,
			metricName: metric,
			metricValue: Number(value.toFixed(3)),
			deviceClass: this.#deviceClass,
			browserFamily: this.#browserFamily,
			viewportWidth: this.#viewportWidth,
			viewportHeight: this.#viewportHeight,
			timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
			language: this.#language
		});
	}

	#send(eventType: TelemetryEventType, extra: Record<string, TelemetryValue>): void {
		if (!import.meta.env.PROD) return;
		const path = String(extra['path'] ?? this.#currentPath ?? '/');
		if (!shouldCollectTelemetryPath(path)) return;
		const payload = {
			eventId: crypto.randomUUID(),
			eventType,
			path,
			sessionHash: this.#sessionHash,
			...omitUndefined(extra)
		};
		const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
		try {
			navigator.sendBeacon('/api/telemetry', body);
		} catch {
			// Beacon unsupported; the event is not recorded.
		}
	}
}

function omitUndefined(value: Record<string, TelemetryValue>): Record<string, string | number> {
	return Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, string | number] => entry[1] !== undefined
		)
	);
}

function referrerHost(): string | undefined {
	if (document.referrer.length === 0) return undefined;
	try {
		return new URL(document.referrer).host;
	} catch {
		return undefined;
	}
}

function detectDeviceClass(): TelemetryDeviceClass {
	const ua = navigator.userAgent;
	if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
	if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
	return 'desktop';
}

function detectBrowserFamily(): string | undefined {
	const ua = navigator.userAgent;
	if (/Edg\//i.test(ua)) return 'edge';
	if (/OPR\/|Opera/i.test(ua)) return 'opera';
	if (/CriOS\//i.test(ua)) return 'chrome-ios';
	if (/Chrome\//i.test(ua)) return 'chrome';
	if (/FxiOS\//i.test(ua)) return 'firefox-ios';
	if (/Firefox\//i.test(ua)) return 'firefox';
	if (/Safari\//i.test(ua)) return 'safari';
	return undefined;
}

function randomHex(bytes: number): string {
	const values = new Uint8Array(bytes);
	crypto.getRandomValues(values);
	return Array.from(values, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
