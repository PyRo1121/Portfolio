import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function createVoyage({ scene, camera, world, renderer, keep, resize, isDisposed }) {
	const body = document.body;
	const panel = document.querySelector('.film-overlay');
	const replay = document.querySelector('#replay-film');
	const skip = document.querySelector('#skip-film');
	const soundButton = document.querySelector('#film-sound');
	const reduce = matchMedia('(prefers-reduced-motion: reduce)');
	const gltf = await new GLTFLoader().loadAsync('/orbit/models/voyager.glb');
	if (isDisposed()) {
		gltf.scene.traverse((node) => {
			if (!node.isMesh) return;
			node.geometry.dispose();
			for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
				for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
				material.dispose();
			}
		});
		throw new Error('Scene unmounted during model loading');
	}
	const ship = new THREE.Group();
	const bounds = new THREE.Box3().setFromObject(gltf.scene);
	const size = bounds.getSize(new THREE.Vector3());
	gltf.scene.position.sub(bounds.getCenter(new THREE.Vector3()));
	const scale = 5.5 / Math.max(size.x, size.y, size.z);
	const normalized = new THREE.Group();
	normalized.add(gltf.scene);
	normalized.scale.setScalar(scale);
	ship.add(normalized);
	scene.add(ship);
	gltf.scene.traverse((node) => {
		if (!node.isMesh) return;
		keep(node.geometry);
		for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
			keep(material);
			material.envMapIntensity = 0.4;
			for (const value of Object.values(material)) if (value?.isTexture) keep(value);
		}
	});
	const pmrem = new THREE.PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	const environment = keep(pmrem.fromScene(room, 0.04));
	scene.environment = environment.texture;
	room.dispose();
	pmrem.dispose();
	const fill = new THREE.DirectionalLight('#ffd9ac', 1.1);
	fill.position.set(-5, 4, 10);
	scene.add(fill);
	const state = {
		cameraX: 7,
		cameraY: 2,
		cameraZ: 17,
		planetX: 3.9,
		planetY: -2.8,
		planetScale: 1.7,
		shipX: -7,
		shipY: -0.3,
		shipZ: 10,
		shipScale: 1,
		shipRotation: -0.7,
		title: 0,
		prelude: 0,
		exposure: 0.75,
		veil: 1
	};
	const timeline = gsap.timeline({ paused: true });
	timeline
		.to(state, { veil: 0, prelude: 1, duration: 1.6, ease: 'power2.out' }, 0)
		.to(
			state,
			{
				cameraX: 1,
				cameraY: 0.5,
				cameraZ: 13,
				planetX: 3.2,
				planetY: -1.7,
				duration: 6,
				ease: 'sine.inOut'
			},
			0
		)
		.to(
			state,
			{ shipX: 1.6, shipY: 0.5, shipZ: 6.5, shipRotation: 0.5, duration: 6.6, ease: 'sine.inOut' },
			0
		)
		.to(state, { exposure: 1.05, duration: 4.5, ease: 'sine.inOut' }, 1)
		.to(state, { prelude: 0, duration: 1 }, 3)
		.to(
			state,
			{
				cameraX: -1,
				cameraY: 1,
				cameraZ: 18,
				planetX: 2.4,
				planetY: -3.8,
				planetScale: 1.25,
				duration: 5.3,
				ease: 'power2.inOut'
			},
			5
		)
		.to(
			state,
			{
				shipX: 8,
				shipY: 2.5,
				shipZ: -2,
				shipScale: 0.35,
				shipRotation: 1.4,
				duration: 5,
				ease: 'power1.inOut'
			},
			6
		)
		.to(state, { title: 1, duration: 2, ease: 'power2.out' }, 6.3)
		.to(state, { title: 0, veil: 1, duration: 1.1, ease: 'power2.in' }, 11.3);
	let active = false,
		pending = false,
		time = 0,
		disposed = false,
		returnFocus = null;
	let audio,
		master,
		soundOn = false;
	const oscillators = [];
	const progress = panel.querySelector('.film-progress span');
	const title = panel.querySelector('.film-title');
	const prelude = panel.querySelector('.film-prelude');
	const shot = panel.querySelector('.film-shot');
	const covered = [
		...document.querySelectorAll(
			'.public-header, .hero-content, .hero-beacon, .orbit-support, .selected-work, .human-section, .closing, .usage-section, .public-footer'
		)
	];
	const priorInert = new Map();
	const curtain = document.createElement('div');
	curtain.className = 'orbit-transition';
	curtain.setAttribute('aria-hidden', 'true');
	body.append(curtain);
	function uncover() {
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				if (disposed) return;
				curtain.style.transition = '';
				curtain.style.opacity = '0';
			})
		);
	}
	function volume(on) {
		if (!master || !audio) return;
		master.gain.cancelScheduledValues(audio.currentTime);
		master.gain.setTargetAtTime(on ? 0.07 : 0, audio.currentTime, 0.4);
	}
	async function toggleSound() {
		try {
			if (!audio) {
				audio = new AudioContext();
				master = audio.createGain();
				master.gain.value = 0;
				master.connect(audio.destination);
				[55, 82.4069, 110, 164.8138, 220.4].forEach((frequency, index) => {
					const oscillator = audio.createOscillator();
					const gain = audio.createGain();
					oscillator.type = 'sine';
					oscillator.frequency.value = frequency;
					gain.gain.value = index > 2 ? 0.09 : 0.2;
					oscillator.connect(gain);
					gain.connect(master);
					oscillator.start();
					oscillators.push(oscillator);
				});
			}
			await audio.resume();
			soundOn = !soundOn;
			soundButton.textContent = soundOn ? 'Sound on' : 'Sound off';
			soundButton.setAttribute('aria-pressed', String(soundOn));
			volume(soundOn && active && body.dataset.motion === 'on' && !document.hidden);
		} catch {
			soundButton.textContent = 'Sound unavailable';
			soundButton.disabled = true;
		}
	}
	function end(restoreFocus = false) {
		pending = false;
		curtain.style.opacity = '0';
		if (!active) return;
		curtain.style.transition = 'none';
		curtain.style.opacity = '1';
		active = false;
		body.dataset.film = 'off';
		panel.hidden = true;
		covered.forEach((element) => {
			element.inert = priorInert.get(element) || false;
		});
		priorInert.clear();
		renderer.toneMappingExposure = 1.1;
		camera.rotation.set(0, 0, 0);
		volume(false);
		if (!disposed) resize();
		uncover();
		if (restoreFocus || panel.contains(document.activeElement))
			(returnFocus || replay).focus({ preventScroll: true });
	}
	async function start() {
		if (
			disposed ||
			active ||
			pending ||
			reduce.matches ||
			body.dataset.motion !== 'on' ||
			body.dataset.scene !== 'ready'
		)
			return false;
		pending = true;
		curtain.style.opacity = '1';
		await new Promise((resolve) => setTimeout(resolve, 420));
		if (disposed || !pending || reduce.matches || body.dataset.motion !== 'on' || document.hidden) {
			pending = false;
			curtain.style.opacity = '0';
			return false;
		}
		pending = false;
		returnFocus = replay;
		active = true;
		time = 0;
		timeline.seek(0);
		body.dataset.film = 'on';
		body.dataset.scene = 'ready';
		panel.hidden = false;
		covered.forEach((element) => {
			priorInert.set(element, element.inert);
			element.inert = true;
		});
		window.scrollTo({ top: 0, behavior: 'instant' });
		skip.focus({ preventScroll: true });
		volume(soundOn);
		resize();
		uncover();
		return true;
	}
	function update(dt, elapsed, center, globeScale) {
		if (!active) {
			ship.visible = true;
			ship.position.copy(center).add(new THREE.Vector3(-4.2 * globeScale, 2.4 * globeScale, 2));
			ship.scale.setScalar(0.33 * globeScale);
			ship.rotation.set(0.18 + Math.sin(elapsed * 0.06) * 0.06, -0.6 + elapsed * 0.025, -0.3);
			return;
		}
		time += dt;
		if (time >= timeline.duration()) {
			end();
			return;
		}
		timeline.time(time);
		const phone = innerWidth <= 600;
		camera.position.set(
			state.cameraX * (phone ? 0.4 : 1),
			state.cameraY,
			state.cameraZ + (phone ? 5 : 0)
		);
		camera.fov = phone ? 48 : 42;
		camera.lookAt(0, 0.5, 0);
		camera.updateProjectionMatrix();
		world.position.set(state.planetX * (phone ? 0.35 : 1), state.planetY + (phone ? 0.6 : 0), 0);
		world.scale.setScalar(state.planetScale);
		ship.position.set(
			state.shipX * (phone ? 0.5 : 1),
			state.shipY + (phone ? 1.7 : 0),
			state.shipZ
		);
		ship.scale.setScalar(state.shipScale * (phone ? 0.75 : 1));
		ship.rotation.set(0.3, state.shipRotation, -0.4);
		renderer.toneMappingExposure = state.exposure;
		panel.style.setProperty('--film-veil', state.veil.toFixed(3));
		title.style.opacity = state.title;
		title.setAttribute('aria-hidden', String(state.title < 0.1));
		title.style.transform = `translateY(${(1 - state.title) * 22}px)`;
		prelude.style.opacity = state.prelude;
		prelude.setAttribute('aria-hidden', String(state.prelude < 0.1));
		progress.style.transform = `scaleX(${time / timeline.duration()})`;
		shot.textContent =
			time < 4 ? '01 / Departure' : time < 7 ? '02 / Approach' : '03 / Back to Earth';
		panel.dataset.time = time.toFixed(2);
	}
	function availability() {
		if (reduce.matches) end();
		volume(soundOn && active && body.dataset.motion === 'on' && !document.hidden);
	}
	function visibility() {
		volume(soundOn && active && !document.hidden && body.dataset.motion === 'on');
	}
	function keyboard(event) {
		if (event.key === 'Escape') end(true);
	}
	function scrollExit() {
		if (active && scrollY > 150) end();
	}
	const replayClick = () => {
			document.dispatchEvent(new CustomEvent('orbit-resume'));
			void start();
		},
		skipClick = () => end(true);
	availability();
	replay.addEventListener('click', replayClick);
	skip.addEventListener('click', skipClick);
	soundButton.addEventListener('click', toggleSound);
	document.addEventListener('orbit-motion', availability);
	reduce.addEventListener('change', availability);
	document.addEventListener('visibilitychange', visibility);
	document.addEventListener('keydown', keyboard);
	window.addEventListener('scroll', scrollExit, { passive: true });
	return {
		update,
		get active() {
			return active;
		},
		cancel: () => end(true),
		dispose() {
			if (disposed) return;
			disposed = true;
			end();
			curtain.remove();
			timeline.kill();
			oscillators.forEach((oscillator) => oscillator.stop());
			audio?.close();
			replay.removeEventListener('click', replayClick);
			skip.removeEventListener('click', skipClick);
			soundButton.removeEventListener('click', toggleSound);
			document.removeEventListener('orbit-motion', availability);
			reduce.removeEventListener('change', availability);
			document.removeEventListener('visibilitychange', visibility);
			document.removeEventListener('keydown', keyboard);
			window.removeEventListener('scroll', scrollExit);
		}
	};
}
