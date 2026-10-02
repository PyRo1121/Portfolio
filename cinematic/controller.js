export function createController(hero) {
	const body = document.body;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const pause = hero.querySelector('#motion-toggle');
	const jump = hero.querySelector('#warp-button');
	const lighting = hero.querySelector('#lighting-toggle');
	let stored;
	try {
		stored = localStorage.getItem('latham-motion');
	} catch {
		/* Optional preference storage. */
	}
	let enabled = !reduced.matches && stored !== 'off';
	let visible = true,
		raf = 0,
		last = 0,
		elapsed = 0,
		boostUntil = 0,
		nebula = false;
	const pointer = { x: 0, y: 0 },
		eased = { x: 0, y: 0 };
	function frame(now) {
		raf = 0;
		if (!enabled || document.hidden || !visible) {
			last = 0;
			return;
		}
		const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
		last = now;
		elapsed += dt;
		eased.x += (pointer.x - eased.x) * 0.05;
		eased.y += (pointer.y - eased.y) * 0.05;
		document.dispatchEvent(
			new CustomEvent('orbit-frame', {
				detail: { elapsed, dt, boost: now < boostUntil, pointer: eased }
			})
		);
		raf = requestAnimationFrame(frame);
	}
	function schedule() {
		if (!raf && enabled && visible && !document.hidden) raf = requestAnimationFrame(frame);
	}
	function sync() {
		enabled = !reduced.matches && stored !== 'off';
		body.dataset.motion = enabled ? 'on' : 'off';
		pause.textContent = reduced.matches
			? 'Reduced motion'
			: enabled
				? 'Pause motion'
				: 'Resume motion';
		pause.disabled = reduced.matches;
		pause.setAttribute('aria-pressed', String(!enabled));
		jump.disabled = !enabled;
		if (!enabled) {
			cancelAnimationFrame(raf);
			raf = 0;
			last = 0;
			boostUntil = 0;
		} else schedule();
		document.dispatchEvent(new CustomEvent('orbit-motion', { detail: { enabled } }));
	}
	function toggle() {
		stored = enabled ? 'off' : 'on';
		try {
			localStorage.setItem('latham-motion', stored);
		} catch {
			/* Storage is optional. */
		}
		sync();
	}
	function warp() {
		if (enabled) boostUntil = performance.now() + 3400;
	}
	function palette() {
		nebula = !nebula;
		body.dataset.lighting = nebula ? 'nebula' : 'starlight';
		lighting.setAttribute('aria-pressed', String(nebula));
		lighting.textContent = nebula ? 'Starlight' : 'Nebula';
		document.dispatchEvent(
			new CustomEvent('orbit-lighting', { detail: { mode: body.dataset.lighting } })
		);
	}
	function move(event) {
		const r = hero.getBoundingClientRect();
		pointer.x = (event.clientX - r.left) / r.width - 0.5;
		pointer.y = (event.clientY - r.top) / r.height - 0.5;
	}
	function leave() {
		pointer.x = pointer.y = 0;
	}
	function visibility() {
		last = 0;
		if (document.hidden) {
			cancelAnimationFrame(raf);
			raf = 0;
		} else schedule();
	}
	const observer = new IntersectionObserver((entries) => {
		visible = entries[0].isIntersecting;
		body.dataset.heroVisible = String(visible);
		if (!visible) {
			cancelAnimationFrame(raf);
			raf = 0;
			last = 0;
		} else schedule();
	});
	observer.observe(hero);
	pause.hidden = jump.hidden = lighting.hidden = false;
	pause.addEventListener('click', toggle);
	jump.addEventListener('click', warp);
	lighting.addEventListener('click', palette);
	hero.addEventListener('pointermove', move);
	hero.addEventListener('pointerleave', leave);
	reduced.addEventListener('change', sync);
	document.addEventListener('visibilitychange', visibility);
	sync();
	return {
		dispose() {
			pause.hidden = jump.hidden = lighting.hidden = true;
			cancelAnimationFrame(raf);
			observer.disconnect();
			pause.removeEventListener('click', toggle);
			jump.removeEventListener('click', warp);
			lighting.removeEventListener('click', palette);
			hero.removeEventListener('pointermove', move);
			hero.removeEventListener('pointerleave', leave);
			reduced.removeEventListener('change', sync);
			document.removeEventListener('visibilitychange', visibility);
		}
	};
}
