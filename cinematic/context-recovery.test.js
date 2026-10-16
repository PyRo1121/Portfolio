import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountObservatory } from './observatory.js';
import { mountPortfolioSpace } from './gallery.js';

const rendered = vi.hoisted(() => ({ frames: 0 }));
vi.mock('three', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		WebGLRenderer: class {
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

afterEach(() => vi.unstubAllGlobals());

describe.each([
	['observatory', mountObservatory],
	['portfolio stars', mountPortfolioSpace]
])('%s context recovery', (_, mount) => {
	it.each([false, true])(
		'restores the scene and its original opacity, reduced motion=%s',
		(reduced) => {
			rendered.frames = 0;
			let nextId = 0;
			const frames = new Map();
			const root = new EventTarget();
			root.getBoundingClientRect = () => ({ top: 0, left: 0, width: 800, height: 1000 });
			const canvas = new EventTarget();
			Object.assign(canvas, {
				closest: () => root,
				clientWidth: 800,
				clientHeight: 600,
				style: { opacity: '0.65' }
			});
			const preference = new EventTarget();
			preference.matches = reduced;
			const document = new EventTarget();
			document.body = { dataset: { motion: reduced ? 'off' : 'on' } };
			document.hidden = false;
			vi.stubGlobal('document', document);
			vi.stubGlobal('window', new EventTarget());
			vi.stubGlobal('matchMedia', () => preference);
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
			const draw = (now) => {
				const callbacks = [...frames.values()];
				frames.clear();
				for (const callback of callbacks) callback(now);
			};
			const scene = mount(canvas);
			draw(100);
			expect(rendered.frames).toBe(1);
			canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
			expect(canvas.style.opacity).toBe('0');
			draw(200);
			expect(rendered.frames).toBe(1);
			canvas.dispatchEvent(new Event('webglcontextrestored'));
			draw(300);
			expect(canvas.style.opacity).toBe('0.65');
			expect(rendered.frames).toBe(2);
			if (typeof scene === 'function') scene();
			else scene.dispose();
			canvas.dispatchEvent(new Event('webglcontextrestored'));
			draw(400);
			expect(rendered.frames).toBe(2);
		}
	);
});
