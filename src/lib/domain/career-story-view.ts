import type { CareerSnapshot } from '$lib/domain/career-accountability';

export type CareerStoryView = {
	readonly shareDraftCount: number;
	readonly privateCount: number;
	readonly canExport: boolean;
};

/** Derive privacy-relevant story counts without exposing records to UI business logic. */
export function createCareerStoryView(snapshot: CareerSnapshot): CareerStoryView {
	const shareDraftCount = snapshot.stories.filter(
		(story) => story.visibility === 'ShareDraft'
	).length;
	return {
		shareDraftCount,
		privateCount: snapshot.stories.length - shareDraftCount,
		canExport: shareDraftCount > 0
	};
}
