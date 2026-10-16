import { afterEach, expect, it, vi } from 'vitest';
import { mountOrbit } from './scene.js';
import { mountPortfolioSpace } from './gallery.js';

const rendered = vi.hoisted(() => ({ frames: 0 }));
vi.mock('three', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		WebGLRenderer: class {
			constructor({ canvas }) {
				if (canvas.heroCanvas) throw new Error('Hero renderer unavailable');
			}
			setPixelRatio() {}
			setSize() {}
			render() {
				rendered.frames++;
			}
			dispose() {}
			forceContextLoss() {}
		}
	};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it('keeps shared pause controls and preferences when only the hero renderer fails', () => {
	rendered.frames = 0;
	let nextId = 0;
	const frames = new Map();
	const button = () => {
		const element = new EventTarget();
		element.setAttribute = () => {};
		return element;
	};
	const controls = new Map(
		['#motion-toggle', '#warp-button', '#lighting-toggle'].map((id) => [id, button()])
	);
	const hero = new EventTarget();
	const heroCanvas = new EventTarget();
	heroCanvas.heroCanvas = true;
	const visual = { getBoundingClientRect: () => ({ width: 800, height: 600 }) };
	const beacon = { style: { removeProperty() {} } };
	hero.querySelector = (selector) =>
		controls.get(selector) ??
		{ '.flight-scene': heroCanvas, '.orbit-visual': visual, '.hero-beacon': beacon }[selector];
	const root = new EventTarget();
	root.getBoundingClientRect = () => ({ top: 0, height: 1000 });
	const stars = new EventTarget();
	Object.assign(stars, { closest: () => root, clientWidth: 800, clientHeight: 600, style: {} });
	const document = new EventTarget();
	document.body = { dataset: {} };
	document.hidden = false;
	const preference = new EventTarget();
	preference.matches = false;
	const localStorage = { getItem: () => 'off', setItem: vi.fn() };
	vi.stubGlobal('document', document);
	vi.stubGlobal('window', new EventTarget());
	vi.stubGlobal('matchMedia', () => preference);
	vi.stubGlobal('localStorage', localStorage);
	vi.stubGlobal('scrollY', 0);
	vi.stubGlobal('innerHeight', 600);
	vi.stubGlobal('devicePixelRatio', 1);
	vi.stubGlobal('requestAnimationFrame', (callback) => {
		frames.set(++nextId, callback);
		return nextId;
	});
	vi.stubGlobal('cancelAnimationFrame', (id) => frames.delete(id));
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(callback) {
				this.callback = callback;
			}
			observe() {
				this.callback([{ isIntersecting: true }]);
			}
			disconnect() {}
		}
	);
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		}
	);
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	const draw = (now) => {
		const callbacks = [...frames.values()];
		frames.clear();
		for (const callback of callbacks) callback(now);
	};
	const disposeHero = mountOrbit(hero);
	const disposeStars = mountPortfolioSpace(stars);
	try {
		expect(controls.get('#motion-toggle').hidden).toBe(false);
		expect(document.body.dataset.motion).toBe('off');
		draw(100);
		expect(rendered.frames).toBe(1);
		draw(200);
		expect(rendered.frames).toBe(1);
		controls.get('#motion-toggle').dispatchEvent(new Event('click'));
		expect(document.body.dataset.motion).toBe('on');
		draw(300);
		draw(400);
		expect(rendered.frames).toBe(3);
		preference.matches = true;
		preference.dispatchEvent(new Event('change'));
		draw(500);
		draw(600);
		expect(rendered.frames).toBe(4);
		expect(controls.get('#motion-toggle').disabled).toBe(true);
	} finally {
		disposeStars();
		disposeHero();
	}
	controls.get('#motion-toggle').dispatchEvent(new Event('click'));
	expect(controls.get('#motion-toggle').hidden).toBe(true);
	expect(frames.size).toBe(0);
	preference.matches = false;
	const disposeRetry = mountOrbit(hero);
	try {
		expect(document.body.dataset.motion).toBe('off');
		controls.get('#motion-toggle').dispatchEvent(new Event('click'));
		expect(document.body.dataset.motion).toBe('on');
		disposeHero();
		expect(document.body.dataset.motion).toBe('on');
		window.dispatchEvent(new Event('pagehide'));
		expect(controls.get('#motion-toggle').hidden).toBe(true);
		expect(frames.size).toBe(0);
	} finally {
		disposeRetry();
	}
});
