import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createVoyage } from './voyage.js';

vi.mock('three', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		PMREMGenerator: class {
			fromScene() {
				return { texture: new original.Texture(), dispose() {} };
			}
			dispose() {}
		}
	};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

it.each([390, 1440])(
	'keeps Starship outside the globe throughout an orbit at %ipx',
	async (width) => {
		const element = () => {
			const node = new EventTarget();
			node.style = {};
			node.setAttribute = () => {};
			node.remove = () => {};
			return node;
		};
		const panel = element();
		panel.querySelector = () => element();
		const document = new EventTarget();
		const body = element();
		body.dataset = { motion: 'on' };
		body.append = () => {};
		document.body = body;
		document.querySelector = (selector) => (selector === '.film-overlay' ? panel : element());
		document.querySelectorAll = () => [];
		document.createElement = element;
		const preference = new EventTarget();
		preference.matches = false;
		vi.stubGlobal('document', document);
		vi.stubGlobal('window', new EventTarget());
		vi.stubGlobal('matchMedia', () => preference);
		vi.stubGlobal('innerWidth', width);
		const scene = new THREE.Scene();
		const resources = new Set();
		const voyage = await createVoyage({
			scene,
			camera: new THREE.PerspectiveCamera(),
			world: new THREE.Group(),
			renderer: {},
			keep: (resource) => {
				resources.add(resource);
				return resource;
			},
			resize() {},
			isDisposed: () => false
		});
		try {
			const ship = scene.children.find((child) => child.isGroup);
			const center = new THREE.Vector3(2, -1, 0);
			const scale = 1.2;
			let minimumRadius = Infinity;
			for (let frame = 0; frame <= 1500; frame++) {
				voyage.update(0.05, frame * 0.05, center, scale, { progress: 1, weight: 0 });
				minimumRadius = Math.min(minimumRadius, ship.position.distanceTo(center) / scale);
			}
			expect(minimumRadius).toBeCloseTo(3.8, 4);
		} finally {
			voyage.dispose();
			for (const resource of resources) resource.dispose?.();
		}
	}
);

it.each(['skip', 'complete', 'dispose'])(
	'isolates the full opening and restores prior interactivity after %s',
	async (exit) => {
		vi.useFakeTimers();
		const document = new EventTarget();
		const element = (className = '', inert = false) => {
			const node = new EventTarget();
			node.className = className;
			node.inert = inert;
			node.style = {};
			node.setAttribute = () => {};
			node.focus = () => {
				document.activeElement = node;
			};
			node.remove = () => {};
			return node;
		};
		const panel = element();
		panel.querySelector = () => element();
		const replay = element();
		const skip = element();
		panel.contains = (node) => node === skip;
		const controls = new Map([
			['.film-overlay', panel],
			['#replay-film', replay],
			['#skip-film', skip],
			['#film-sound', element()],
			['.launch-caption', element()]
		]);
		const outside = [
			element('observatory'),
			element('skip-link'),
			element('public-header'),
			element('human-section', true)
		];
		const body = element();
		body.dataset = { motion: 'on', scene: 'ready' };
		body.append = () => {};
		document.body = body;
		document.hidden = false;
		document.querySelector = (selector) => controls.get(selector);
		document.querySelectorAll = (selector) => {
			const classes = selector.split(',').map((value) => value.trim());
			return outside.filter((node) => classes.includes(`.${node.className}`));
		};
		document.createElement = () => element();
		const preference = new EventTarget();
		preference.matches = false;
		const window = new EventTarget();
		window.scrollTo = () => {};
		vi.stubGlobal('document', document);
		vi.stubGlobal('window', window);
		vi.stubGlobal('matchMedia', () => preference);
		vi.stubGlobal('innerWidth', 390);
		vi.stubGlobal('requestAnimationFrame', () => 1);
		const resources = new Set();
		const voyage = await createVoyage({
			scene: new THREE.Scene(),
			camera: new THREE.PerspectiveCamera(),
			world: new THREE.Group(),
			renderer: {},
			keep: (resource) => {
				resources.add(resource);
				return resource;
			},
			resize() {},
			isDisposed: () => false
		});
		try {
			replay.dispatchEvent(new Event('click'));
			await vi.advanceTimersByTimeAsync(420);
			expect(voyage.active).toBe(true);
			expect(document.activeElement).toBe(skip);
			expect(outside.map((node) => node.inert)).toEqual([true, true, true, true]);
			if (exit === 'skip') skip.dispatchEvent(new Event('click'));
			else if (exit === 'complete') voyage.update(13, 13, new THREE.Vector3(), 1);
			else voyage.dispose();
			expect(voyage.active).toBe(false);
			expect(outside.map((node) => node.inert)).toEqual([false, false, false, true]);
			expect(document.activeElement).toBe(replay);
		} finally {
			voyage.dispose();
			for (const resource of resources) resource.dispose?.();
		}
	}
);
