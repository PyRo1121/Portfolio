import type { GitHubDashboardSnapshot } from './github-intelligence';

/** Persisted cache metadata returned with the initial dashboard render. */
export type DashboardCacheState = {
	readonly _tag: 'Cold' | 'Cached';
	readonly cachedAt: string | null;
};

/** Outcome of one background GitHub refresh. Rejections are converted into values server-side. */
export type DashboardRefreshResult =
	| {
			readonly _tag: 'Fresh';
			readonly snapshot: GitHubDashboardSnapshot;
			readonly refreshedAt: string;
	  }
	| { readonly _tag: 'Current'; readonly checkedAt: string }
	| { readonly _tag: 'Deferred'; readonly deferredAt: string; readonly retryAfterMs: number }
	| { readonly _tag: 'Unavailable'; readonly attemptedAt: string; readonly reason: string };
