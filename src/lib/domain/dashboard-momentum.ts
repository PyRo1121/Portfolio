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
			? 'Exceptional momentum'
			: score >= 68
				? 'Strong momentum'
				: score >= 50
					? 'A steady build rhythm'
					: 'The next win is ready';
	const message =
		todayCommits > 0
			? `${todayCommits} commits landed today. Finish with one clean handoff while the context is warm.`
			: activeDays >= 5
				? `${activeDays} active days built this window. One deliberate commit today keeps the cadence alive.`
				: snapshot.totals.commits > 0
					? `${snapshot.totals.commits} commits moved the work forward. Choose the smallest useful finish for today.`
					: 'The window is clear. One useful commit is enough to start the signal.';

	return { score, label, message, activeDays, todayCommits };
}
