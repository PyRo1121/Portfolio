import type { GitHubDashboardSnapshot } from './github-intelligence';

export type PublicPortfolioEvidence =
	| {
			readonly _tag: 'Current';
			readonly activeRepositories: number;
			readonly commits: number;
			readonly generatedAt: string;
			readonly generatedAtLabel: string;
			readonly periodLabel: string;
			readonly provenance: 'Demonstration' | 'Observed';
	  }
	| { readonly _tag: 'Unavailable'; readonly reason: string };

const UTC_TIMESTAMP = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
	timeZone: 'UTC',
	timeZoneName: 'short'
});

/** Reduce the complete dashboard snapshot to the small evidence summary used by the portfolio. */
export function createPublicPortfolioEvidence(
	snapshot: GitHubDashboardSnapshot | null
): PublicPortfolioEvidence {
	if (snapshot === null) {
		return { _tag: 'Unavailable', reason: 'Live evidence is warming.' };
	}

	return {
		_tag: 'Current',
		activeRepositories: snapshot.intelligence.account.activeRepositories,
		commits: snapshot.totals.commits,
		generatedAt: snapshot.generatedAt,
		generatedAtLabel: UTC_TIMESTAMP.format(new Date(snapshot.generatedAt)),
		periodLabel: snapshot.period.label,
		provenance: snapshot.source._tag === 'Live' ? 'Observed' : 'Demonstration'
	};
}
