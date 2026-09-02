import { invalidateAll } from '$app/navigation';

const MAX_RETRY_MS = 60_000;
const MAX_BACKOFF_STEP = 6;

type DeferredResult = { readonly _tag: 'Deferred'; readonly retryAfterMs: number };

/** One deferred-refresh poll channel with bounded exponential backoff. */
export function createDeferredRefreshPoll() {
	let attempt = 0;
	return <Result extends { readonly _tag: string }>(
		activeRefresh: Promise<Result>,
		onDeferred: (result: Extract<Result, DeferredResult>) => void,
		onSettled: (result: Exclude<Result, DeferredResult>) => void
	): (() => void) => {
		let cancelled = false;
		let retryId: number | undefined;
		void activeRefresh.then((result) => {
			if (cancelled) return;
			if (result._tag === 'Deferred') {
				// SAFETY: the runtime tag check above discriminates the union.
				const deferred = result as Extract<Result, DeferredResult>;
				onDeferred(deferred);
				const delay = Math.min(
					MAX_RETRY_MS,
					deferred.retryAfterMs * 2 ** Math.min(attempt, MAX_BACKOFF_STEP)
				);
				attempt += 1;
				retryId = window.setTimeout(() => void invalidateAll(), delay);
				return;
			}
			attempt = 0;
			// SAFETY: every non-Deferred member of Result reaches the settled handler.
			onSettled(result as Exclude<Result, DeferredResult>);
		});
		return () => {
			cancelled = true;
			if (retryId !== undefined) window.clearTimeout(retryId);
		};
	};
}
