import type { KVNamespace } from '@cloudflare/workers-types';
import type {
	CloudflareUsageRefreshResult,
	CloudflareUsageSnapshot
} from '$lib/domain/cloudflare-usage';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			cloudflare: CloudflareUsageSnapshot | null;
			cloudflareCache: { readonly _tag: 'Cold' | 'Cached'; readonly cachedAt: string | null };
			cloudflareRefresh: Promise<CloudflareUsageRefreshResult>;
		}
		// interface PageState {}
		interface Platform {
			env: {
				CLOUDFLARE_ACCOUNT_ID?: string;
				CLOUDFLARE_API_TOKEN?: string;
				GITHUB_TOKEN?: string;
				GITHUB_USERNAME?: string;
				WEEKNOTE_CACHE: KVNamespace;
			};
		}
	}
}

export {};
