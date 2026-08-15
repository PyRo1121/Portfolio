import type { ViewerActivityProjection } from './dashboard-viewer-time';
import type { GitHubDashboardSnapshot } from './github-intelligence';

/** A compact, evidence-based motivational readout for the rolling window. */
export type DashboardMomentum = {
	readonly score: number;
	readonly label: string;
	readonly message: string;
	readonly activeDays: number;
	readonly todayCommits: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

/** Derive an encouraging momentum signal without hiding a slower comparison window. */
export function createDashboardMomentum(
	snapshot: GitHubDashboardSnapshot,
	projection?: ViewerActivityProjection
): DashboardMomentum {
	const days = projection?.days ?? snapshot.intelligence.engineeringDays;
	const activeDays = days.filter((day) => day.commits > 0).length;
	const todayCommits = days.at(-1)?.commits ?? 0;
	const activeRepositories = snapshot.intelligence.account.activeRepositories;
	const comparison = snapshot.intelligence.comparison;
	const consistencyScore = (activeDays / 7) * 45;
	const focusScore = Math.min(activeRepositories / 4, 1) * 20;
	const trendScore =
		comparison.direction === 'up'
			? 25
			: comparison.direction === 'flat'
				? 18
				: clamp(18 - Math.abs(comparison.changePercent ?? 0) * 0.2, 6, 18);
	const todayScore = todayCommits > 0 ? 10 : 0;
	const score = Math.round(clamp(consistencyScore + focusScore + trendScore + todayScore, 0, 100));
	const label =
		score >= 82
			? 'Very active week'
			: score >= 68
				? 'Active week'
				: score >= 50
					? 'Moderate activity'
					: 'Light activity';
	const todayCommitLabel = todayCommits === 1 ? 'commit' : 'commits';
	const totalCommitLabel = snapshot.totals.commits === 1 ? 'commit' : 'commits';
	const message =
		todayCommits > 0
			? `${todayCommits} ${todayCommitLabel} today; ${activeDays} active days in the current seven-day window.`
			: activeDays >= 5
				? `${activeDays} active days in the current seven-day window.`
				: snapshot.totals.commits > 0
					? `${snapshot.totals.commits} ${totalCommitLabel} across ${activeDays} active days in the current seven-day window.`
					: 'No default-branch commits in the current seven-day window.';

	return { score, label, message, activeDays, todayCommits };
}
