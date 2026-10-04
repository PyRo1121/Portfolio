const smooth = (value) => value * value * (3 - 2 * value);

export function createArrival({ returning = false, onComplete = () => {} } = {}) {
	const duration = returning ? 1.6 : 7.2;
	let state = 'pending',
		time = 0,
		settling = 0;
	function finish() {
		if (state === 'complete') return;
		state = 'complete';
		onComplete();
	}
	return {
		get state() {
			return state;
		},
		interrupt() {
			if (state === 'playing') state = 'settling';
		},
		advance({ dt = 0, visible = false, motion = true, reduced = false, film = false } = {}) {
			if (reduced || !motion || film || (!visible && (state === 'playing' || state === 'settling')))
				finish();
			if (state === 'pending' && visible) state = 'playing';
			if (state === 'playing' || state === 'settling') {
				if (visible) time += Math.max(0, dt);
				if (state === 'settling') settling += Math.max(0, dt);
				if (time >= duration || settling >= 0.45) finish();
			}
			const progress = Math.min(1, time / duration);
			const weight =
				state === 'complete' || state === 'pending'
					? 0
					: (returning ? 0.35 * (1 - smooth(Math.max(0, (progress - 0.7) / 0.3))) : 1) *
						(1 - smooth(Math.min(1, settling / 0.45)));
			return {
				progress,
				launchProgress: returning ? 0.9 + progress * 0.1 : progress,
				weight,
				focus: Math.sin(Math.PI * progress) ** 2 * weight
			};
		}
	};
}
