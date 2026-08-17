import type { TelemetryDeviceClass } from '$lib/domain/telemetry';

/**
 * Privacy-light visitor telemetry collector. Sends page-view, workspace, and
 * Core Web Vitals beacons to the server. No cookies are written and raw IPs
 * are never sent; each page load gets an in-memory session hash.
 */
export class ClientTelemetry {
	readonly #sessionHash = randomHex(16);
	readonly #path = window.location.pathname;
	readonly #deviceClass = detectDeviceClass();
	readonly #browserFamily = detectBrowserFamily();
	readonly #viewportWidth = window.innerWidth;
	readonly #viewportHeight = window.innerHeight;
	readonly #timezoneOffsetMinutes = new Date().getTimezoneOffset();
	readonly #language = navigator.language;

	constructor() {
		this.#send('page_view', {
			path: this.#path,
			workspace: undefined,
			referrerHost: referrerHost(),
			deviceClass: this.#deviceClass,
			browserFamily: this.#browserFamily,
			viewportWidth: this.#viewportWidth,
			viewportHeight: this.#viewportHeight,
			timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
			language: this.#language
		});
		this.#observeWebVitals();
	}

	/** Record one workspace navigation event. */
	recordWorkspace(workspace: string): void {
		this.#send('workspace_view', {
			path: this.#path,
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
		this.#observeType('largest-contentful-paint', 'lcp', (entry) =>
			entry.startTime >= 0 ? entry.startTime : null
		);
		this.#observeType('layout-shift', 'cls', (entry) => {
			return (entry as unknown as { readonly value?: number }).value ?? 0;
		});
	}

	#observeType(
		type: 'largest-contentful-paint' | 'layout-shift',
		metric: 'lcp' | 'cls',
		valueOf: (entry: PerformanceEntry) => number | null
	): void {
		const observed: number[] = [];
		try {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const value = valueOf(entry);
					if (value !== null) observed.push(value);
				}
			});
			observer.observe({ type, buffered: true });
			window.addEventListener(
				'pagehide',
				() => {
					if (observed.length === 0) return;
					const value =
						metric === 'cls'
							? observed.reduce((sum, item) => sum + item, 0)
							: (observed.at(-1) ?? 0);
					this.#send('web_vital', {
						path: this.#path,
						metricName: metric,
						metricValue: Number(value.toFixed(3)),
						deviceClass: this.#deviceClass,
						browserFamily: this.#browserFamily,
						viewportWidth: this.#viewportWidth,
						viewportHeight: this.#viewportHeight,
						timezoneOffsetMinutes: this.#timezoneOffsetMinutes,
						language: this.#language
					});
				},
				{ once: true }
			);
		} catch {
			// Unsupported metric type; skip silently.
		}
	}

	#send(
		eventType: 'page_view' | 'workspace_view' | 'web_vital',
		extra: Record<string, string | number | undefined>
	): void {
		if (!import.meta.env.PROD) return;
		const payload = {
			eventType,
			path: extra['path'],
			sessionHash: this.#sessionHash,
			...omitUndefined(extra)
		};
		const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
		try {
			navigator.sendBeacon('/api/telemetry', body);
		} catch {
			// Beacon unsupported; the visit is not recorded.
		}
	}
}

function omitUndefined(
	value: Record<string, string | number | undefined>
): Record<string, string | number> {
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
