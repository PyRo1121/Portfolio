import { describe, it, expect, vi } from 'vitest';
import { createArrival } from './arrival.js';

describe('inline arrival', () => {
	it('waits for the globe, then finishes once at the resting pose', () => {
		const onComplete = vi.fn(),
			arrival = createArrival({ onComplete });
		expect(arrival.advance({ dt: 10 }).weight).toBe(0);
		expect(arrival.state).toBe('pending');
		expect(arrival.advance({ visible: true, dt: 2.4 }).focus).toBe(1);
		expect(arrival.advance({ visible: true, dt: 2.4 }).weight).toBe(0);
		arrival.advance({ visible: true, dt: 20 });
		expect(onComplete).toHaveBeenCalledTimes(1);
	});
	it.each([{ reduced: true }, { motion: false }, { film: true }])(
		'does not autoplay when unavailable: %j',
		(constraint) => {
			const arrival = createArrival();
			expect(arrival.advance({ visible: true, ...constraint }).weight).toBe(0);
			expect(arrival.advance({ visible: true, dt: 1 }).weight).toBe(0);
		}
	);
	it('settles promptly after scrolling, without restarting', () => {
		const arrival = createArrival();
		arrival.advance({ visible: true, dt: 1 });
		arrival.interrupt();
		expect(arrival.advance({ visible: true, dt: 0.2 }).weight).toBeGreaterThan(0);
		expect(arrival.advance({ visible: false, dt: 0.25 }).weight).toBe(0);
		expect(arrival.state).toBe('complete');
	});
	it('uses elapsed time and a shorter returning visit', () => {
		const arrival = createArrival({ returning: true });
		expect(arrival.advance({ visible: true, dt: 0.8 }).focus).toBe(0.35);
		expect(arrival.advance({ visible: true, dt: 0.8 }).weight).toBe(0);
	});
	it.each([false, true])(
		'finishes offscreen with no remaining animation on return, settling=%s',
		(settling) => {
			const arrival = createArrival();
			arrival.advance({ visible: true, dt: 1.5 });
			if (settling) arrival.interrupt();
			expect(arrival.advance({ visible: false, dt: 0 }).weight).toBe(0);
			expect(arrival.state).toBe('complete');
			expect(arrival.advance({ visible: true, dt: 0.016 }).weight).toBe(0);
		}
	);
});
