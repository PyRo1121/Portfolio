import { shouldCollectTelemetryPath, type TelemetryDeviceClass } from '$lib/domain/telemetry';

type VitalMetric = 'lcp' | 'fcp' | 'ttfb' | 'inp' | 'cls';
type TelemetryValue = string | number | undefined;

/**
 * Visitor telemetry collector. Sends page, navigation, and browser-performance
 * evidence without cookies or raw IP addresses. Metrics flush after load and
 * again when the page is hidden so a visitor who stays on the page is counted.
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
	readonly #observed = new Map<VitalMetric, number[]>();
	readonly #supportedVitals = new Set<VitalMetric>();
	readonly #sentVitals = new Set<VitalMetric>();
	#currentPath: string | null = null;
	#vitalsPath: string | null = null;

	constructor() {
		this.#observeWebVitals();
		this.#scheduleVitalFlush();
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

	#observeWebVitals(): void {
		if (!('PerformanceObserver' in window)) return;
		this.#observeType('largest-contentful-paint', 'lcp', (entry) => entry.startTime);
		this.#observeType(
			'layout-shift',
			'cls',
			(entry) => (entry as unknown as { readonly value?: number }).value ?? 0
		);
		this.#observeType('event', 'inp', (entry) => {
			const duration = (entry as PerformanceEventTiming).duration;
			return duration >= 40 ? duration : null;
		});
	}

	#observeType(
		type: string,
		metric: VitalMetric,
		valueOf: (entry: PerformanceEntry) => number | null
	): void {
		try {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const value = valueOf(entry);
					if (value !== null) {
						const values = this.#observed.get(metric) ?? [];
						values.push(value);
						this.#observed.set(metric, values);
					}
				}
			});
			observer.observe({ type, buffered: true } as PerformanceObserverInit);
			this.#supportedVitals.add(metric);
		} catch {
			// Unsupported metric type; other browser metrics still flush.
		}
	}

	#scheduleVitalFlush(): void {
		const flush = (): void => this.#flushVitals();
		if (document.readyState === 'complete') {
			window.setTimeout(flush, 2000);
		} else {
			window.addEventListener('load', () => window.setTimeout(flush, 2000), { once: true });
		}
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') flush();
		});
		window.addEventListener('pagehide', flush);
	}

	#flushVitals(): void {
		const navigation = performance.getEntriesByType('navigation')[0] as
			PerformanceNavigationTiming | undefined;
		const fcp = performance.getEntriesByName('first-contentful-paint')[0];
		if (navigation?.responseStart !== undefined)
			this.#recordVital('ttfb', navigation.responseStart);
		if (fcp !== undefined) this.#recordVital('fcp', fcp.startTime);

		for (const [metric, values] of this.#observed) {
			if (metric === 'cls') {
				this.#recordVital(
					metric,
					values.reduce((sum, value) => sum + value, 0)
				);
			} else if (values.length > 0) {
				this.#recordVital(metric, metric === 'inp' ? Math.max(...values) : (values.at(-1) ?? 0));
			}
		}
		// A supported CLS observer with no shifts is still a useful zero sample.
		if (this.#supportedVitals.has('cls') && !this.#observed.has('cls')) {
			this.#recordVital('cls', 0);
		}
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

	#send(
		eventType: 'page_view' | 'workspace_view' | 'web_vital' | 'error',
		extra: Record<string, TelemetryValue>
	): void {
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
