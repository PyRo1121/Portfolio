import type { ObservedCareerStoryEvidence } from '$lib/domain/career-accountability';
import { retainedDeliveryOutcomes } from '$lib/domain/dashboard-delivery-outcomes';
import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';

export type CareerStoryEvidenceOption = {
	readonly kind: ObservedCareerStoryEvidence['kind'];
	readonly title: string;
	readonly repository: string;
	readonly url: string;
	readonly occurredAt: string;
	readonly label: string;
};

function artifactKindLabel(kind: CareerStoryEvidenceOption['kind']): string {
	if (kind === 'PullRequest') return 'Merged PR';
	if (kind === 'Issue') return 'Closed issue';
	return 'Release';
}

/** Build selectable story evidence only from a live retained GitHub snapshot. */
export function createCareerStoryEvidenceOptions(
	snapshot: GitHubDashboardSnapshot
): ReadonlyArray<CareerStoryEvidenceOption> {
	if (snapshot.source._tag !== 'Live') return [];
	return retainedDeliveryOutcomes(snapshot).map((artifact) => ({
		kind: artifact.kind as CareerStoryEvidenceOption['kind'],
		title: artifact.title,
		repository: artifact.repository,
		url: artifact.url,
		occurredAt: artifact.occurredAt,
		label: `${artifactKindLabel(artifact.kind as CareerStoryEvidenceOption['kind'])} · ${artifact.repository} · ${artifact.title}`
	}));
}

/** Resolve an untrusted form URL to the canonical retained artifact selected by the owner. */
export function observedCareerStoryEvidence(
	options: ReadonlyArray<CareerStoryEvidenceOption>,
	url: string,
	observedAt: Date
): ObservedCareerStoryEvidence | null {
	const selected = options.find((option) => option.url === url);
	return selected === undefined
		? null
		: {
				_tag: 'Observed',
				source: 'GitHub',
				kind: selected.kind,
				title: selected.title,
				repository: selected.repository,
				url: selected.url,
				occurredAt: selected.occurredAt,
				observedAt: observedAt.toISOString()
			};
}
