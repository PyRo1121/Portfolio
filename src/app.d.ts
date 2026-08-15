import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { CareerSnapshot } from '$lib/domain/career-accountability';
import type {
	CloudflareUsageRefreshResult,
	CloudflareUsageSnapshot
} from '$lib/domain/cloudflare-usage';
import type { OwnerProjectSnapshot } from '$lib/domain/owner-project';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			career: CareerSnapshot | null;
			ownerProjects: OwnerProjectSnapshot | null;
			ownerProjectAccess: {
				readonly _tag: 'Current' | 'Unavailable';
				readonly reason: string;
			};
			careerAccess: {
				readonly _tag: 'Current' | 'Unavailable';
				readonly reason: string;
			};
			cloudflare: CloudflareUsageSnapshot | null;
			cloudflareCache: { readonly _tag: 'Cold' | 'Cached'; readonly cachedAt: string | null };
			cloudflareRefresh: Promise<CloudflareUsageRefreshResult>;
		}
		// interface PageState {}
		interface Platform {
			env: {
				CAREER_DB: D1Database;
				OWNER_DB: D1Database;
				CAREER_OWNER_EMAIL?: string;
				CLOUDFLARE_ACCOUNT_ID?: string;
				CLOUDFLARE_API_TOKEN?: string;
				GITHUB_CHECKS_APP_ID?: string;
				GITHUB_CHECKS_APP_PRIVATE_KEY?: string;
				GITHUB_CHECKS_INSTALLATION_ID?: string;
				GITHUB_TOKEN?: string;
				GITHUB_USERNAME?: string;
				WEEKNOTE_CACHE: KVNamespace;
			};
		}
	}
}

export {};
