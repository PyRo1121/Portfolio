/** Format an exact Cloudflare resource byte measurement with a decimal unit. */
export function formatCloudflareResourceBytes(bytes: number): string {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1_000 && unitIndex < units.length - 1) {
		value /= 1_000;
		unitIndex += 1;
	}
	return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}
