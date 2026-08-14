import type { EngineeringDay } from './github-intelligence';

/** Return the latest viewer-local engineering date containing commit evidence. */
export function latestActiveEngineeringDate(days: ReadonlyArray<EngineeringDay>): string {
	return [...days].reverse().find((day) => day.commits > 0)?.date ?? days.at(-1)?.date ?? '';
}
