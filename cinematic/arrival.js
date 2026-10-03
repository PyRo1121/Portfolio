const smooth = (value) => value * value * (3 - 2 * value);

export function createArrival({ returning = false, onComplete = () => {} } = {}) {
	const duration = returning ? 1.6 : 4.8;
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
			if (reduced || !motion || film) finish();
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
					: (returning ? 0.35 : 1) * (1 - smooth(Math.min(1, settling / 0.45)));
			return { progress, weight, focus: Math.sin(Math.PI * progress) ** 2 * weight };
		}
	};
}
