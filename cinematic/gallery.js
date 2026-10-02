import * as THREE from 'three';

export function mountPortfolioSpace(canvas) {
	const root = canvas.closest('.portfolio-content');
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	let renderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
			powerPreference: 'low-power'
		});
	} catch {
		return () => {};
	}
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 70);
	camera.position.z = 12;
	const geometry = new THREE.BufferGeometry();
	const positions = new Float32Array(900 * 3);
	let seed = 74;
	const random = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	for (let i = 0; i < positions.length; i += 3) {
		positions[i] = (random() - 0.5) * 42;
		positions[i + 1] = (random() - 0.5) * 28;
		positions[i + 2] = -random() * 25;
	}
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const material = new THREE.PointsMaterial({
		color: '#cfdae4',
		size: 0.032,
		transparent: true,
		opacity: 0.5,
		depthWrite: false
	});
	const stars = new THREE.Points(geometry, material);
	scene.add(stars);
	const orbitGeometry = new THREE.RingGeometry(4.2, 4.217, 180);
	const orbitMaterial = new THREE.MeshBasicMaterial({
		color: '#dfa57a',
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.075,
		depthWrite: false
	});
	const orbits = new THREE.Group();
	for (let i = 0; i < 3; i++) {
		const ring = new THREE.Mesh(orbitGeometry, orbitMaterial);
		ring.scale.setScalar(1 + i * 0.19);
		ring.rotation.set(0.7 + i * 0.16, 0.25, -0.4);
		orbits.add(ring);
	}
	orbits.position.set(4, 0, -1);
	scene.add(orbits);
	let frame = 0,
		last = 0,
		visible = false,
		progress = 0,
		lost = false,
		disposed = false;
	let renderWidth = 0,
		renderHeight = 0;
	let enabled = document.body.dataset.motion !== 'off' && !reduced.matches;
	const warm = new THREE.Color('#dfa57a'),
		cool = new THREE.Color('#85c4e4');
	function draw(now = 0) {
		frame = 0;
		if (disposed || lost || document.hidden || !visible) return;
		if (now - last >= 32 || !enabled) {
			const delta = Math.min((now - last) / 1000, 0.05);
			last = now;
			if (enabled) stars.rotation.y += delta * 0.008;
			stars.position.y = enabled ? progress * 2 : 0;
			orbits.rotation.z = enabled ? -progress * 0.7 : -0.2;
			orbits.position.x = enabled ? 4 - Math.sin(progress * Math.PI) * 7 : 2;
			orbitMaterial.color.copy(warm).lerp(cool, Math.sin(progress * Math.PI));
			renderer.render(scene, camera);
		}
		if (enabled) frame = requestAnimationFrame(draw);
	}
	function schedule() {
		if (!frame && visible && !document.hidden && !disposed && !lost)
			frame = requestAnimationFrame(draw);
	}
	function scroll() {
		const rect = root.getBoundingClientRect();
		progress = THREE.MathUtils.clamp(-rect.top / Math.max(1, rect.height - innerHeight), 0, 1);
		schedule();
	}
	function resize() {
		const width = canvas.clientWidth,
			height = innerHeight;
		if (!width || (renderWidth === width && renderHeight === height)) return;
		renderWidth = width;
		renderHeight = height;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		scroll();
	}
	function motion() {
		enabled = document.body.dataset.motion !== 'off' && !reduced.matches;
		cancelAnimationFrame(frame);
		frame = 0;
		last = 0;
		schedule();
	}
	function visibility() {
		cancelAnimationFrame(frame);
		frame = 0;
		last = 0;
		schedule();
	}
	function contextLost(event) {
		event.preventDefault();
		lost = true;
		canvas.style.opacity = '0';
		visible = false;
		cancelAnimationFrame(frame);
		frame = 0;
	}
	const observer = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		if (visible) schedule();
		else {
			cancelAnimationFrame(frame);
			frame = 0;
		}
	});
	observer.observe(root);
	const sizing = new ResizeObserver(resize);
	sizing.observe(canvas);
	window.addEventListener('scroll', scroll, { passive: true });
	window.addEventListener('resize', resize);
	document.addEventListener('orbit-motion', motion);
	document.addEventListener('visibilitychange', visibility);
	reduced.addEventListener('change', motion);
	canvas.addEventListener('webglcontextlost', contextLost);
	resize();
	return () => {
		disposed = true;
		cancelAnimationFrame(frame);
		observer.disconnect();
		sizing.disconnect();
		window.removeEventListener('scroll', scroll);
		window.removeEventListener('resize', resize);
		document.removeEventListener('orbit-motion', motion);
		document.removeEventListener('visibilitychange', visibility);
		reduced.removeEventListener('change', motion);
		canvas.removeEventListener('webglcontextlost', contextLost);
		geometry.dispose();
		material.dispose();
		orbitGeometry.dispose();
		orbitMaterial.dispose();
		renderer.dispose();
	};
}
