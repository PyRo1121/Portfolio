import * as THREE from 'three';
import { gsap } from 'gsap';
import {
	createStarship,
	launchPose,
	createLaunchTrajectory,
	orbitalPoint,
	orbitalTangent
} from './starship.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function createVoyage({ scene, camera, world, renderer, keep, resize, isDisposed }) {
	const body = document.body;
	const panel = document.querySelector('.film-overlay');
	const replay = document.querySelector('#replay-film');
	const skip = document.querySelector('#skip-film');
	const soundButton = document.querySelector('#film-sound');
	const caption = document.querySelector('.launch-caption');
	const reduce = matchMedia('(prefers-reduced-motion: reduce)');
	if (isDisposed()) throw new Error('Scene unmounted');
	const { vehicle: ship, booster, plume, plumeMaterial } = createStarship(keep);
	scene.add(ship);
	const pmrem = new THREE.PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	const environment = keep(pmrem.fromScene(room, 0.04));
	scene.environment = environment.texture;
	room.dispose();
	pmrem.dispose();
	const fill = new THREE.DirectionalLight('#ffd9ac', 1.1);
	fill.position.set(-5, 4, 10);
	scene.add(fill);
	const state = { title: 0, prelude: 0, veil: 1 };
	const timeline = gsap.timeline({ paused: true });
	timeline
		.to(state, { veil: 0, prelude: 1, duration: 1.6, ease: 'power2.out' }, 0)
		.to(state, { prelude: 0, duration: 1 }, 3)
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
			'.public-header, .hero-content, .hero-beacon, .orbit-support, .observatory, .human-section, .closing, .usage-section, .public-footer'
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
		orbitTime = 0;
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
	const axis = new THREE.Vector3(0, 1, 0);
	const direction = new THREE.Vector3();
	const position = new THREE.Vector3();
	const orbitPosition = new THREE.Vector3();
	const orbitRotation = new THREE.Quaternion();
	const launchRotation = new THREE.Quaternion();
	const trajectory = createLaunchTrajectory();
	let orbitTime = 0;
	function flight(progress, weight, dt, center, globeScale) {
		const pose = launchPose(progress);
		const phone = innerWidth <= 600;
		orbitTime += Math.min(dt, 0.05) * (1 - weight);
		const angle = orbitTime * 0.09;
		orbitalPoint(angle, orbitPosition);
		orbitalTangent(angle, direction);
		if (phone) {
			orbitPosition.x *= 0.6;
			direction.z *= 0.2;
			direction.normalize();
		}
		orbitRotation.setFromUnitVectors(axis, direction);
		trajectory.getPoint(pose.ascent, position);
		trajectory.getTangent(pose.ascent, direction);
		if (phone) {
			position.x *= THREE.MathUtils.lerp(
				1,
				0.6,
				THREE.MathUtils.smoothstep(pose.ascent, 0.15, 0.45)
			);
			direction.z *= 0.2;
			direction.normalize();
		}
		launchRotation.setFromUnitVectors(axis, direction);
		launchRotation.slerp(orbitRotation, pose.turn);
		ship.position.copy(orbitPosition).lerp(position, weight).multiplyScalar(globeScale).add(center);
		ship.quaternion.copy(orbitRotation).slerp(launchRotation, weight);
		ship.scale.setScalar(
			THREE.MathUtils.lerp(0.42, 0.16 + pose.ascent * 0.26, weight) * globeScale * (phone ? 0.9 : 1)
		);
		booster.visible = weight > 0.01 && pose.separation < 1;
		booster.position.set(-pose.separation * 0.6, -pose.separation * 2.5, 0);
		booster.rotation.z = pose.separation * 0.4;
		plume.visible = weight > 0 && pose.ignition > 0;
		plume.position.y = THREE.MathUtils.lerp(-3.2, -0.85, pose.separation);
		plume.scale.set(1, 0.75 + pose.ignition * 0.25, 1);
		plumeMaterial.uniforms.uPower.value = pose.ignition * weight;
	}
	function update(dt, elapsed, center, globeScale, arrival = { progress: 0, weight: 0 }) {
		if (!active) {
			flight(arrival.launchProgress ?? arrival.progress, arrival.weight, dt, center, globeScale);
			caption.hidden = arrival.weight < 0.5;
			caption.textContent =
				arrival.progress < 0.28
					? 'STARBASE, TEXAS / IGNITION'
					: arrival.progress < 0.65
						? 'STARBASE, TEXAS / ASCENT'
						: 'STARSHIP / INTO ORBIT';
			return;
		}
		caption.hidden = true;
		time += dt;
		if (time >= timeline.duration()) {
			end();
			return;
		}
		timeline.time(time);
		const phone = innerWidth <= 600;
		camera.position.set(0, 0.4, phone ? 24 : 20);
		camera.fov = phone ? 48 : 42;
		camera.lookAt(0, 0.5, 0);
		camera.updateProjectionMatrix();
		world.position.set(0, phone ? -1 : -0.3, 0);
		world.scale.setScalar(phone ? 1.1 : 1.65);
		flight(Math.min(1, time / 10.5), 1, dt, world.position, world.scale.x);
		renderer.toneMappingExposure = 1.1;
		panel.style.setProperty('--film-veil', state.veil.toFixed(3));
		title.style.opacity = state.title;
		title.setAttribute('aria-hidden', String(state.title < 0.1));
		title.style.transform = `translateY(${(1 - state.title) * 22}px)`;
		prelude.style.opacity = state.prelude;
		prelude.setAttribute('aria-hidden', String(state.prelude < 0.1));
		progress.style.transform = `scaleX(${time / timeline.duration()})`;
		shot.textContent =
			time < 3 ? '01 / Starbase, Texas' : time < 6 ? '02 / Ascent' : '03 / Into orbit';
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
		get earthTurn() {
			return active ? launchPose(Math.min(1, time / 10.5)).turn : null;
		},
		get active() {
			return active;
		},
		cancel: () => end(true),
		dispose() {
			if (disposed) return;
			disposed = true;
			caption.hidden = true;
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
