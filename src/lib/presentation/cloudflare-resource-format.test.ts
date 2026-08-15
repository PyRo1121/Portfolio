import { describe, expect, it } from 'vitest';
import { formatCloudflareResourceBytes } from './cloudflare-resource-format';

describe('formatCloudflareResourceBytes', () => {
	it('keeps exact small values and uses readable decimal storage units', () => {
		expect(formatCloudflareResourceBytes(912)).toBe('912 B');
		expect(formatCloudflareResourceBytes(90_112)).toBe('90 KB');
		expect(formatCloudflareResourceBytes(709_595_136)).toBe('710 MB');
	});
});
