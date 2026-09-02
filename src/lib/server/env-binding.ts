import { env } from '$env/dynamic/private';

/** Read one secret binding from the Cloudflare runtime first, then the dynamic env fallback. */
export function envBinding(platform: App.Platform | undefined, name: string): string | undefined {
	// SAFETY: callers pass binding names that exist in the generated platform env type.
	const platformValue = (platform?.env as unknown as Record<string, string | undefined>)[name];
	return platformValue?.trim() || env[name]?.trim();
}
