import * as THREE from 'three';

// Original geometry inspired by Starship's silhouette; no downloaded model or textures.
export function createStarship(keep) {
	const vehicle = new THREE.Group();
	const booster = new THREE.Group();
	const steel = keep(
		new THREE.MeshStandardMaterial({ color: '#c6d1dc', metalness: 0.85, roughness: 0.32 })
	);
	const tiles = keep(
		new THREE.MeshStandardMaterial({ color: '#101923', metalness: 0.15, roughness: 0.75 })
	);
	const seam = keep(
		new THREE.MeshStandardMaterial({ color: '#697783', metalness: 0.8, roughness: 0.4 })
	);
	const profile = [
		[0.19, 0],
		[0.19, 1.25],
		[0.17, 1.48],
		[0.12, 1.7],
		[0.055, 1.88],
		[0, 1.98]
	].map(([x, y]) => new THREE.Vector2(x, y));
	const hull = keep(new THREE.LatheGeometry(profile, 32));
	vehicle.add(new THREE.Mesh(hull, steel));
	const shield = keep(
		new THREE.LatheGeometry(
			profile.map((p) => new THREE.Vector2(p.x * 1.005, p.y)),
			32,
			Math.PI,
			Math.PI
		)
	);
	vehicle.add(new THREE.Mesh(shield, tiles));
	const band = keep(new THREE.TorusGeometry(0.191, 0.006, 4, 32));
	const matrix = new THREE.Object3D();
	function rings(parent, start, end, spacing) {
		const count = Math.ceil((end - start) / spacing);
		const mesh = new THREE.InstancedMesh(band, seam, count);
		for (let i = 0; i < count; i++) {
			matrix.position.set(0, start + i * spacing, 0);
			matrix.rotation.set(Math.PI / 2, 0, 0);
			matrix.updateMatrix();
			mesh.setMatrixAt(i, matrix.matrix);
		}
		keep(mesh);
		parent.add(mesh);
	}
	rings(vehicle, 0.12, 1.35, 0.16);
	const finShape = new THREE.Shape();
	finShape.moveTo(0, 0);
	finShape.lineTo(0.32, -0.15);
	finShape.lineTo(0.4, 0.05);
	finShape.lineTo(0.06, 0.38);
	finShape.closePath();
	const finGeometry = keep(
		new THREE.ExtrudeGeometry(finShape, { depth: 0.025, bevelEnabled: false })
	);
	for (const y of [0.18, 1.35])
		for (const side of [-1, 1]) {
			const fin = new THREE.Mesh(finGeometry, tiles);
			fin.position.set(side * 0.16, y, 0);
			fin.scale.set(side, y > 1 ? 0.55 : 1, 1);
			vehicle.add(fin);
		}
	const cylinder = keep(new THREE.CylinderGeometry(0.19, 0.19, 2.3, 32));
	const boosterHull = new THREE.Mesh(cylinder, steel);
	boosterHull.position.y = -1.19;
	booster.add(boosterHull);
	rings(booster, -2.25, 0, 0.2);
	const nozzle = keep(new THREE.CylinderGeometry(0.025, 0.045, 0.1, 12, 1, true));
	for (const [parent, y, count] of [
		[vehicle, -0.04, 6],
		[booster, -2.39, 12]
	]) {
		const engines = new THREE.InstancedMesh(nozzle, tiles, count);
		for (let i = 0; i < count; i++) {
			const a = (i / count) * Math.PI * 2;
			matrix.position.set(Math.cos(a) * 0.12, y, Math.sin(a) * 0.12);
			matrix.rotation.set(0, 0, 0);
			matrix.updateMatrix();
			engines.setMatrixAt(i, matrix.matrix);
		}
		keep(engines);
		parent.add(engines);
	}
	const plumeMaterial = keep(
		new THREE.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
			uniforms: { uPower: { value: 0 } },
			vertexShader:
				'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
			fragmentShader:
				'varying vec2 vUv; uniform float uPower; void main(){float tip=smoothstep(0.,.35,vUv.y);float a=tip*(1.-smoothstep(.7,1.,vUv.y))*uPower*.65;vec3 c=mix(vec3(.95,.32,.06),vec3(.45,.75,1.),vUv.y);gl_FragColor=vec4(c,a);}'
		})
	);
	const plume = new THREE.Mesh(keep(new THREE.ConeGeometry(0.19, 1.7, 24, 1, true)), plumeMaterial);
	plume.rotation.z = Math.PI;
	plume.position.y = -3.2;
	vehicle.add(booster, plume);
	return { vehicle, booster, plume, plumeMaterial };
}

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
	const t = clamp(value);
	return t * t * (3 - 2 * t);
};

export function launchPose(progress) {
	const ascent = smooth((progress - 0.12) / 0.7);
	return {
		ascent,
		separation: smooth((progress - 0.52) / 0.18),
		ignition: smooth(progress / 0.08) * (1 - smooth((progress - 0.72) / 0.18)),
		turn: smooth((progress - 0.28) / 0.72)
	};
}

export function starbaseDirection(rotation) {
	const latitude = THREE.MathUtils.degToRad(25.997),
		longitude = THREE.MathUtils.degToRad(-97.156);
	return new THREE.Vector3(
		Math.cos(latitude) * Math.cos(longitude),
		Math.sin(latitude),
		-Math.cos(latitude) * Math.sin(longitude)
	).applyEuler(new THREE.Euler(0, rotation, 0.12));
}

export function orbitalPoint(angle, target = new THREE.Vector3()) {
	return target.set(
		-1.3 * Math.cos(angle) + 3.1 * Math.sin(angle),
		1.4 * Math.cos(angle),
		3.8 * Math.cos(angle) - 1.6 * Math.sin(angle)
	);
}

export function orbitalTangent(angle, target = new THREE.Vector3()) {
	return target
		.set(
			1.3 * Math.sin(angle) + 3.1 * Math.cos(angle),
			-1.4 * Math.sin(angle),
			-3.8 * Math.sin(angle) - 1.6 * Math.cos(angle)
		)
		.normalize();
}

export function createLaunchTrajectory() {
	const start = starbaseDirection(-0.3).multiplyScalar(3.52);
	const end = orbitalPoint(0);
	return new THREE.CubicBezierCurve3(
		start,
		start.clone().multiplyScalar(1.65),
		end.clone().addScaledVector(orbitalTangent(0), -0.8),
		end
	);
}
