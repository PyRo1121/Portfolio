import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onCLS } from 'web-vitals';

vi.mock('web-vitals', () => ({
	onCLS: vi.fn(),
	onFCP: vi.fn(),
	onINP: vi.fn(),
	onLCP: vi.fn(),
	onTTFB: vi.fn()
}));

describe('browser telemetry privacy and error budget', () => {
	let browser: EventTarget;
	let signals: { doNotTrack: string | null; globalPrivacyControl: boolean };
	let sendBeacon: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.stubEnv('PROD', true);
		browser = new EventTarget();
		signals = { doNotTrack: null, globalPrivacyControl: false };
		sendBeacon = vi.fn(() => true);
		vi.stubGlobal(
			'window',
			Object.assign(browser, { innerWidth: 390, innerHeight: 844, location: { pathname: '/' } })
		);
		vi.stubGlobal('document', { referrer: '' });
		vi.stubGlobal('navigator', {
			get doNotTrack() {
				return signals.doNotTrack;
			},
			get globalPrivacyControl() {
				return signals.globalPrivacyControl;
			},
			userAgent: 'Safari/18',
			language: 'en-US',
			sendBeacon
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it.each(['1', 'yes'])('does not initialize observers when Do Not Track is %s', async (value) => {
		signals.doNotTrack = value;
		const { getClientTelemetry } = await import('./client-telemetry');
		expect(getClientTelemetry()).toBeNull();
		expect(onCLS).not.toHaveBeenCalled();
		expect(sendBeacon).not.toHaveBeenCalled();
	});

	it('does not initialize observers when Global Privacy Control is enabled', async () => {
		signals.globalPrivacyControl = true;
		const { getClientTelemetry } = await import('./client-telemetry');
		expect(getClientTelemetry()).toBeNull();
		expect(onCLS).not.toHaveBeenCalled();
	});

	it('stops a previously initialized collector when the visitor opts out', async () => {
		const { getClientTelemetry } = await import('./client-telemetry');
		const telemetry = getClientTelemetry();
		expect(telemetry).not.toBeNull();
		telemetry?.recordPage('/');
		expect(sendBeacon).toHaveBeenCalledTimes(1);
		signals.globalPrivacyControl = true;
		telemetry?.recordContact('email_summary');
		browser.dispatchEvent(new Event('error'));
		expect(sendBeacon).toHaveBeenCalledTimes(1);
		expect(getClientTelemetry()).toBeNull();
	});

	it('caps combined runtime errors and rejected promises without blocking other events', async () => {
		const { getClientTelemetry } = await import('./client-telemetry');
		const telemetry = getClientTelemetry();
		expect(getClientTelemetry()).toBe(telemetry);
		for (let index = 0; index < 12; index += 1) {
			browser.dispatchEvent(new Event(index % 2 === 0 ? 'error' : 'unhandledrejection'));
		}
		expect(sendBeacon).toHaveBeenCalledTimes(5);
		telemetry?.recordPage('/about');
		telemetry?.recordContact('email_about');
		expect(sendBeacon).toHaveBeenCalledTimes(7);
	});
});
