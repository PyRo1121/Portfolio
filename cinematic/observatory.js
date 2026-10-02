import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPointer;
float hash(vec3 p) {
  p = fract(p * .3183099 + vec3(.11, .27, .43));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float cloud(vec3 p) {
  float value = 0.0, amplitude = .5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec3(13.1, 7.7, 2.9);
    amplitude *= .5;
  }
  return value;
}
void main() {
  vec2 uv = vUv;
  vec2 p = (uv - vec2(.7, .80)) * vec2(uAspect, 1.0);
  p += uPointer * .025;
  float t = uTime * .028;
  float dust = cloud(vec3(p * 3.2, t));
  float filament = p.y + p.x * .26 - sin(p.x * 1.7 + .5) * .16;
  float body = exp(-abs(filament + (dust - .5) * .42) * 16.0);
  float rift = smoothstep(.38, .75, cloud(vec3(p * 6.0 + dust * 2.0, t * .6 + 4.0)));
  float wisps = pow(max(dust, 0.0), 2.3) * body;
  float light = wisps * (1.0 - rift * .9);
  vec3 color = uColor * light * 4.0;
  color += vec3(.23, .36, .48) * dust * exp(-abs(filament + .24) * 5.0) * .17;
  float edge = smoothstep(0.0, .18, uv.y) * smoothstep(0.0, .2, 1.0 - uv.y);
  float leftShade = smoothstep(.05, .6, uv.x);
  gl_FragColor = vec4(pow(max(color, vec3(0.0)), vec3(.8)) * edge * leftShade, 1.0);
}`;

export function mountObservatory(canvas, initialProject = 0) {
	const root = canvas.closest('.observatory');
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	let renderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: false,
			powerPreference: 'low-power'
		});
	} catch {
		return { select() {}, dispose() {} };
	}
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 70);
	camera.position.z = 10;
	const colors = ['#d89d68', '#64b2d2', '#79c4a5'].map((color) => new THREE.Color(color));
	const targetColor = colors[initialProject].clone();
	const pointer = new THREE.Vector2();
	const material = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		depthWrite: false,
		depthTest: false,
		uniforms: {
			uTime: { value: 0 },
			uAspect: { value: 1 },
			uColor: { value: targetColor.clone() },
			uPointer: { value: new THREE.Vector2() }
		}
	});
	const planeGeometry = new THREE.PlaneGeometry(2, 2);
	const nebula = new THREE.Mesh(planeGeometry, material);
	nebula.frustumCulled = false;
	nebula.renderOrder = -1;
	scene.add(nebula);
	const positions = new Float32Array(1200 * 3);
	let seed = 827;
	const random = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	for (let i = 0; i < positions.length; i += 3) {
		positions[i] = (random() - 0.5) * 40;
		positions[i + 1] = (random() - 0.5) * 22;
		positions[i + 2] = -random() * 24;
	}
	const starGeometry = new THREE.BufferGeometry();
	starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const starMaterial = new THREE.PointsMaterial({
		color: '#d2e1ed',
		size: 0.022,
		transparent: true,
		opacity: 0.7,
		depthWrite: false
	});
	const stars = new THREE.Points(starGeometry, starMaterial);
	scene.add(stars);
	let disposed = false,
		lost = false,
		visible = false,
		frame = 0,
		last = 0;
	let width = 0,
		height = 0;
	let motionEnabled = !reduced.matches && document.body.dataset.motion !== 'off';
	function draw(now = 0) {
		frame = 0;
		if (disposed || lost || !visible || document.hidden) return;
		if (now - last >= 32 || !motionEnabled) {
			const delta = Math.min(Math.max((now - last) / 1000, 0), 0.05);
			last = now;
			if (motionEnabled) {
				material.uniforms.uTime.value += delta;
				material.uniforms.uColor.value.lerp(targetColor, 1 - Math.exp(-delta * 3));
				material.uniforms.uPointer.value.lerp(pointer, 1 - Math.exp(-delta * 3));
				stars.rotation.y += delta * 0.003;
				stars.position.x = material.uniforms.uPointer.value.x * 0.1;
			} else {
				material.uniforms.uColor.value.copy(targetColor);
				material.uniforms.uPointer.value.set(0, 0);
			}
			renderer.render(scene, camera);
		}
		if (motionEnabled) frame = requestAnimationFrame(draw);
	}
	function schedule() {
		if (!frame && visible && !disposed && !lost && !document.hidden)
			frame = requestAnimationFrame(draw);
	}
	function resize() {
		const nextWidth = canvas.clientWidth,
			nextHeight = canvas.clientHeight;
		if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return;
		width = nextWidth;
		height = nextHeight;
		renderer.setSize(width, height, false);
		material.uniforms.uAspect.value = width / height;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		schedule();
	}
	function pause() {
		motionEnabled = !reduced.matches && document.body.dataset.motion !== 'off';
		cancelAnimationFrame(frame);
		frame = 0;
		last = 0;
		schedule();
	}
	function point(event) {
		if (!motionEnabled || event.pointerType === 'touch') return;
		const rect = root.getBoundingClientRect();
		pointer.set(
			(event.clientX - rect.left) / rect.width - 0.5,
			(event.clientY - rect.top) / rect.height - 0.5
		);
	}
	function leave() {
		pointer.set(0, 0);
	}
	function contextLost(event) {
		event.preventDefault();
		lost = true;
		canvas.style.opacity = '0';
		cancelAnimationFrame(frame);
		frame = 0;
	}
	const observer = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		cancelAnimationFrame(frame);
		frame = 0;
		last = 0;
		schedule();
	});
	observer.observe(root);
	const sizing = new ResizeObserver(resize);
	sizing.observe(canvas);
	root.addEventListener('pointermove', point, { passive: true });
	root.addEventListener('pointerleave', leave);
	document.addEventListener('orbit-motion', pause);
	document.addEventListener('visibilitychange', pause);
	reduced.addEventListener('change', pause);
	canvas.addEventListener('webglcontextlost', contextLost);
	resize();
	return {
		select(index) {
			targetColor.copy(colors[index] ?? colors[0]);
			schedule();
		},
		dispose() {
			disposed = true;
			cancelAnimationFrame(frame);
			observer.disconnect();
			sizing.disconnect();
			root.removeEventListener('pointermove', point);
			root.removeEventListener('pointerleave', leave);
			document.removeEventListener('orbit-motion', pause);
			document.removeEventListener('visibilitychange', pause);
			reduced.removeEventListener('change', pause);
			canvas.removeEventListener('webglcontextlost', contextLost);
			planeGeometry.dispose();
			material.dispose();
			starGeometry.dispose();
			starMaterial.dispose();
			renderer.dispose();
		}
	};
}
