import type { CareerSnapshot } from './career-accountability';
import {
	createCareerAccountabilityView,
	type CareerFollowUpReminder
} from './career-workspace-view';

/** Owner-home Career pulse for first paint. Never mounts the full review. */
export type OwnerBriefingView =
	| {
			readonly _tag: 'Ready';
			readonly primary: CareerFollowUpReminder;
			readonly extraCount: number;
	  }
	| { readonly _tag: 'Empty'; readonly extraCount: 0 }
	| { readonly _tag: 'Unavailable'; readonly reason: string; readonly extraCount: 0 };

/** Derive earliest-due follow-up and extra reminder count from Career data. */
export function createOwnerBriefingView(
	career: CareerSnapshot | null,
	today: string,
	unavailableReason = 'Career storage is temporarily unavailable.'
): OwnerBriefingView {
	if (career === null) {
		return { _tag: 'Unavailable', reason: unavailableReason, extraCount: 0 };
	}
	const reminders = createCareerAccountabilityView(career, today).followUpReminders;
	const primary = reminders[0];
	if (primary === undefined) {
		return { _tag: 'Empty', extraCount: 0 };
	}
	return {
		_tag: 'Ready',
		primary,
		extraCount: reminders.length - 1
	};
}
