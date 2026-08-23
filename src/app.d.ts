import type { D1Database, Fetcher, KVNamespace, RateLimit } from '@cloudflare/workers-types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: {
				CAREER_DB: D1Database;
				OWNER_DB: D1Database;
				REFRESH_COORDINATOR: Fetcher;
				CAREER_OWNER_EMAIL?: string;
				CLOUDFLARE_ACCESS_AUD?: string;
				CLOUDFLARE_ACCESS_TEAM_DOMAIN?: string;
				CLOUDFLARE_ACCOUNT_ID?: string;
				CLOUDFLARE_API_TOKEN?: string;
				GITHUB_CHECKS_APP_ID?: string;
				GITHUB_CHECKS_APP_PRIVATE_KEY?: string;
				GITHUB_CHECKS_INSTALLATION_ID?: string;
				GITHUB_ORGANIZATION_REPOSITORIES?: string;
				GITHUB_ORGANIZATION_TOKEN?: string;
				GITHUB_TOKEN?: string;
				GITHUB_USERNAME?: string;
				TELEMETRY_RATE_LIMITER: RateLimit;
				WARM_SECRET?: string;
				WEEKNOTE_CACHE: KVNamespace;
			};
		}
	}
}

export {};
