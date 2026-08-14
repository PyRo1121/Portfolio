import { Effect } from 'effect';
import type { ObservedCareerStoryEvidence } from '$lib/domain/career-accountability';
import {
	createCareerStoryEvidenceOptions,
	observedCareerStoryEvidence
} from '$lib/domain/career-story-evidence';
import type { DashboardCacheStore } from '$lib/server/dashboard-snapshot-cache';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';

export class CareerStoryEvidenceError extends Error {
	readonly _tag = 'CareerStoryEvidenceError';

	constructor(readonly reason: string) {
		super(reason);
	}
}

/** Resolve an untrusted story form selection against the current live cached GitHub snapshot. */
export function resolveObservedCareerStoryEvidence(
	store: DashboardCacheStore,
	username: string,
	selectedUrl: string | null,
	now: Date
): Effect.Effect<ObservedCareerStoryEvidence | null, CareerStoryEvidenceError> {
	if (selectedUrl === null) return Effect.succeed(null);
	return Effect.gen(function* () {
		const cached = yield* Effect.promise(() => dashboardSnapshotCacheFor(store).read(username));
		if (cached === null) {
			return yield* Effect.fail(
				new CareerStoryEvidenceError(
					'Live GitHub evidence is unavailable. Reload before associating this story.'
				)
			);
		}
		const evidence = observedCareerStoryEvidence(
			createCareerStoryEvidenceOptions(cached.snapshot),
			selectedUrl,
			now
		);
		return evidence === null
			? yield* Effect.fail(
					new CareerStoryEvidenceError(
						'Selected GitHub evidence is no longer retained. Reload and choose an observed outcome.'
					)
				)
			: evidence;
	});
}
