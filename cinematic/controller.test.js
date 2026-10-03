import { afterEach, expect, it, vi } from 'vitest';
import { createController } from './controller.js';

afterEach(() => vi.unstubAllGlobals());

it('keeps film time accurate at low frame rates and excludes paused or hidden time', () => {
	const buttons = new Map(
		['#motion-toggle', '#warp-button', '#lighting-toggle'].map((id) => {
			const button = new EventTarget();
			button.setAttribute = () => {};
			return [id, button];
		})
	);
	const hero = new EventTarget();
	hero.querySelector = (id) => buttons.get(id);
	const document = new EventTarget();
	document.body = { dataset: {} };
	document.hidden = false;
	const preference = new EventTarget();
	preference.matches = false;
	let nextFrame;
	vi.stubGlobal('document', document);
	vi.stubGlobal('matchMedia', () => preference);
	vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
	vi.stubGlobal('requestAnimationFrame', (callback) => {
		nextFrame = callback;
		return 1;
	});
	vi.stubGlobal('cancelAnimationFrame', () => {
		nextFrame = undefined;
	});
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			observe() {}
			disconnect() {}
		}
	);
	const frames = [];
	document.addEventListener('orbit-frame', (event) => frames.push(event.detail.dt));
	const controller = createController(hero);
	nextFrame(1000);
	nextFrame(1200);
	expect(frames).toEqual([0, 0.2]);
	buttons.get('#motion-toggle').dispatchEvent(new Event('click'));
	expect(nextFrame).toBeUndefined();
	document.dispatchEvent(new Event('orbit-resume'));
	nextFrame(5000);
	expect(frames.at(-1)).toBe(0);
	document.hidden = true;
	document.dispatchEvent(new Event('visibilitychange'));
	expect(nextFrame).toBeUndefined();
	document.hidden = false;
	document.dispatchEvent(new Event('visibilitychange'));
	nextFrame(10000);
	nextFrame(10100);
	expect(frames.slice(-2)).toEqual([0, 0.1]);
	controller.dispose();
	expect(nextFrame).toBeUndefined();
});
