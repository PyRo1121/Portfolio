import { createController } from './controller.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createVoyage } from './voyage.js';

export function mountOrbit(hero) {
	const body = document.body;
	const canvas = hero.querySelector('.flight-scene');
	const beacon = hero.querySelector('.hero-beacon');
	const controller = createController(hero);
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const resources = new Set();
	const keep = (value) => (resources.add(value), value);
	const scene = new THREE.Scene();
	scene.background = new THREE.Color('#040710');
	const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
	camera.position.z = 18;
	const world = new THREE.Group();
	const globe = new THREE.Group();
	const orbit = new THREE.Group();
	world.add(globe, orbit);
	scene.add(world);
	let renderer, composer, bloom, resizeObserver, voyage, lens;
	let ready = false,
		disposed = false,
		lost = false;
	let width = 1,
		height = 1,
		pixelRatio = 0,
		redraw = 0;
	let sceneTime = 0,
		travel = 0,
		jump = 0,
		frames = 0;
	let slowFrames = 0,
		balanced = false;
	let nebula = 0,
		paletteTarget = body.dataset.lighting === 'nebula' ? 1 : 0;
	let arrival = body.dataset.motion === 'on' && !reduced.matches ? 1 : 0;
	let previous = { dt: 0, elapsed: 0, boost: false, pointer: { x: 0, y: 0 } };
	const center = new THREE.Vector3();
	const projected = new THREE.Vector3();
	const ice = new THREE.Color('#89d9ff');
	const ion = new THREE.Color('#cc93ff');
	const sun = new THREE.Vector3(-0.85, 0.5, 0.25).normalize();
	const atmosphereColor = new THREE.Color();
	const keyColor = new THREE.Color('#d8edff');
	let earth, clouds, earthMaterial;

	const key = new THREE.DirectionalLight(keyColor, 2.2);
	key.position.copy(sun).multiplyScalar(14);
	scene.add(key);
	scene.add(new THREE.HemisphereLight('#769dc8', '#070713', 0.5));
	const rim = new THREE.DirectionalLight('#ba98ff', 2.2);
	rim.position.set(8, 2, -5);
	scene.add(rim);
	const surfaceVertex = `
  varying vec2 vUv; varying vec3 vNormal,vWorld;
  void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;
    vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`;

	const atmosphereUniforms = { uColor: { value: ice.clone() }, uSun: { value: sun } };
	const atmosphereMaterial = keep(
		new THREE.ShaderMaterial({
			uniforms: atmosphereUniforms,
			vertexShader: surfaceVertex,
			fragmentShader: `uniform vec3 uColor,uSun;varying vec3 vNormal,vWorld;
    void main(){vec3 n=normalize(vNormal),view=normalize(cameraPosition-vWorld);
      float fresnel=pow(1.-abs(dot(n,view)),3.8);float sunlight=smoothstep(-.5,.8,dot(n,uSun));
      gl_FragColor=vec4(uColor*(1.2+sunlight*1.8),fresnel*(.04+sunlight*.4));}`,
			transparent: true,
			blending: THREE.AdditiveBlending,
			side: THREE.BackSide,
			depthWrite: false
		})
	);
	const sphere = keep(new THREE.SphereGeometry(3, 80, 48));
	const atmosphere = new THREE.Mesh(sphere, atmosphereMaterial);
	atmosphere.scale.setScalar(1.025);
	globe.add(atmosphere);

	const ringUniforms = { uTime: { value: 0 }, uColor: { value: ice.clone() }, uJump: { value: 0 } };
	const ringMaterial = keep(
		new THREE.ShaderMaterial({
			uniforms: ringUniforms,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
			fragmentShader: `uniform float uTime,uJump;uniform vec3 uColor;varying vec2 vUv;
    void main(){float pulse=pow(.5+.5*cos(vUv.x*6.283185-uTime*.27),12.);
      float core=pow(1.-abs(vUv.y-.5)*2.,2.);
      gl_FragColor=vec4(uColor*(1.1+pulse),core*(.3+pulse*.45)*(1.-uJump*.65));}`
		})
	);
	orbit.add(
		new THREE.Mesh(keep(new THREE.TorusGeometry(4.05, 0.017, 6, 256)), ringMaterial),
		new THREE.Mesh(keep(new THREE.TorusGeometry(4.28, 0.006, 5, 256)), ringMaterial)
	);
	orbit.rotation.set(1.12, 0.18, -0.31);
	const satelliteGeometry = keep(new THREE.SphereGeometry(0.063, 12, 8));
	const satelliteMaterial = keep(
		new THREE.MeshBasicMaterial({
			color: new THREE.Color('#b9e7ff').multiplyScalar(1.8)
		})
	);
	const satellites = Array.from({ length: 6 }, () => {
		const node = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
		orbit.add(node);
		return node;
	});

	const backdropUniforms = {
		uMap: { value: null },
		uAspect: { value: 1 },
		uTime: { value: 0 },
		uNebula: { value: 0 }
	};
	const backdropMaterial = keep(
		new THREE.ShaderMaterial({
			uniforms: backdropUniforms,
			depthWrite: false,
			depthTest: false,
			vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
			fragmentShader: `
    uniform sampler2D uMap;uniform float uAspect,uTime,uNebula;varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
    float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(.8,.6,-.6,.8)*p*2.1;a*=.48;}return n;}
    void main(){vec2 p=(vUv-.5)*vec2(uAspect,1.);vec2 uv=vec2(vUv.x*.62+uTime*.00012,vUv.y*.7+.1);
      vec3 stars=texture2D(uMap,uv).rgb*.28;float haze=fbm(p*3.8+vec2(uTime*.007,0.));
      float band=exp(-pow((p.y-p.x*.42+.04)*2.8,2.));float wisps=pow(fbm(p*5.+haze*2.),3.)*band;
      vec3 blue=mix(vec3(.016,.04,.13),vec3(.15,.055,.24),uNebula);vec3 c=stars+blue*wisps*2.3;
      c*=mix(.26,1.,smoothstep(.15,.65,vUv.x));c*=smoothstep(0.,.16,vUv.y);
      gl_FragColor=vec4(c+vec3(.001,.002,.005),1.);}`
		})
	);
	const backdrop = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), backdropMaterial);
	backdrop.frustumCulled = false;
	backdrop.renderOrder = -100;
	scene.add(backdrop);

	const starCount = matchMedia('(max-width:600px)').matches ? 440 : 1300;
	const starGeometry = keep(new THREE.InstancedBufferGeometry());
	starGeometry.setAttribute(
		'position',
		new THREE.Float32BufferAttribute(
			[-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
			3
		)
	);
	starGeometry.setAttribute(
		'uv',
		new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2)
	);
	const seed = new Float32Array(starCount * 4);
	for (let i = 0; i < starCount; i++)
		seed.set(
			[
				(Math.random() - 0.5) * 60,
				(Math.random() - 0.5) * 40,
				Math.random(),
				0.6 + Math.random() * 1.5
			],
			i * 4
		);
	starGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
	starGeometry.instanceCount = starCount;
	const starUniforms = {
		uTime: { value: 0 },
		uTravel: { value: 0 },
		uJump: { value: 0 },
		uColor: { value: ice.clone() }
	};
	const starMaterial = keep(
		new THREE.ShaderMaterial({
			uniforms: starUniforms,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexShader: `attribute vec4 aSeed;uniform float uTime,uTravel,uJump;varying vec2 vUv;varying float vAlpha;
    void main(){float z=12.-fract(aSeed.z-uTravel*.007)*75.;vec4 mv=modelViewMatrix*vec4(aSeed.xy,z,1.);
      vec2 radial=normalize(aSeed.xy+vec2(.001)),tangent=vec2(-radial.y,radial.x);float size=.018*aSeed.w;
      mv.xy+=tangent*position.x*size+radial*position.y*size*(1.+uJump*180.);vUv=uv;
      vAlpha=(.3+aSeed.w*.22)*smoothstep(0.,3.,-mv.z)*(.8+.2*sin(uTime*.6+aSeed.z*50.));gl_Position=projectionMatrix*mv;}`,
			fragmentShader: `uniform vec3 uColor;varying vec2 vUv;varying float vAlpha;void main(){float a=smoothstep(.5,.02,length(vUv-.5));gl_FragColor=vec4(mix(vec3(1.4),uColor,.3),a*vAlpha);}`
		})
	);
	const stars = new THREE.Mesh(starGeometry, starMaterial);
	stars.frustumCulled = false;
	scene.add(stars);

	const flareMaterial = keep(
		new THREE.ShaderMaterial({
			uniforms: { uColor: { value: ice.clone() } },
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
			fragmentShader: `uniform vec3 uColor;varying vec2 vUv;void main(){vec2 p=vUv-.5;float r=length(p);float glow=exp(-r*18.),core=exp(-r*90.);float streak=exp(-abs(p.y)*220.)*exp(-abs(p.x)*9.);float a=glow*.22+core*1.5+streak*.17;gl_FragColor=vec4(uColor*(1.+core*2.),a);}`
		})
	);
	const flare = new THREE.Mesh(keep(new THREE.PlaneGeometry(10, 10)), flareMaterial);
	flare.position.set(-2.45, 2.08, -0.5);
	world.add(flare);

	function projectAnchor() {
		world.getWorldPosition(center);
		projected.copy(center).project(camera);
		const x = (projected.x * 0.5 + 0.5) * width,
			y = (-projected.y * 0.5 + 0.5) * height;
		beacon.style.left = `${x}px`;
		beacon.style.top = `${y}px`;
		beacon.style.right = 'auto';
		beacon.style.transform = 'translate(-50%,-50%)';
		beacon.style.setProperty('--reading-opacity', String(1 - jump * 0.85));
		canvas.dataset.anchorX = x.toFixed(2);
		canvas.dataset.anchorY = y.toFixed(2);
	}
	function resize() {
		if (!renderer || disposed) return;
		const rect = hero.getBoundingClientRect();
		const nextWidth = Math.max(1, Math.round(rect.width));
		const nextHeight = Math.max(1, Math.round(voyage?.active ? innerHeight : rect.height));
		const mobile = nextWidth <= 600;
		const dpr = Math.min(devicePixelRatio || 1, mobile || balanced ? 1 : 1.35);
		if (width !== nextWidth || height !== nextHeight || pixelRatio !== dpr) {
			const ratioChanged = pixelRatio !== dpr;
			width = nextWidth;
			height = nextHeight;
			pixelRatio = dpr;
			renderer.setDrawingBufferSize(width, height, dpr);
			if (ratioChanged) composer.setPixelRatio(dpr);
			composer.setSize(width, height);
		}
		bloom.enabled = !mobile;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		backdropUniforms.uAspect.value = camera.aspect;
		canvas.dataset.quality = mobile || balanced ? 'balanced' : 'cinematic';
		const radiusPixels = mobile
			? Math.min(width * 0.43, 190)
			: Math.min(width * 0.235, height * 0.36);
		const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(21)) * 18;
		world.scale.setScalar(((radiusPixels / height) * viewHeight) / 3);
		const x = mobile ? 0.5 : width < 1000 ? 0.76 : 0.755,
			y = mobile ? 0.79 : 0.48;
		world.position.set((x - 0.5) * viewHeight * camera.aspect, (0.5 - y) * viewHeight, 0);
		if (ready && !redraw)
			redraw = requestAnimationFrame(() => {
				redraw = 0;
				render(previous, 0);
			});
	}
	function render(frame, dt) {
		if (!ready || disposed || lost) return;
		previous = frame;
		if (dt > 0.034) slowFrames++;
		else slowFrames = Math.max(0, slowFrames - 1);
		if (slowFrames > 60 && !balanced && !voyage?.active) {
			balanced = true;
			resize();
		}
		const moving = body.dataset.motion === 'on' && !reduced.matches,
			step = moving ? Math.min(dt, 0.05) : 0;
		sceneTime += step;
		nebula = moving
			? THREE.MathUtils.lerp(nebula, paletteTarget, 1 - Math.exp(-step * 3))
			: paletteTarget;
		const jumpTarget = moving && frame.boost ? 1 : 0;
		jump = moving
			? THREE.MathUtils.lerp(jump, jumpTarget, 1 - Math.exp(-step * (jumpTarget ? 3 : 2)))
			: 0;
		arrival = moving ? Math.max(0, arrival - step / 3.6) : 0;
		travel += step * (0.55 + jump * 48);
		const entry = arrival * arrival * arrival;
		camera.position.set(
			frame.pointer.x * 0.24 + entry * 0.6,
			frame.pointer.y * 0.13 + entry * 0.25,
			18 + entry * 5 + jump * 1.6
		);
		camera.rotation.set(0, 0, 0);
		camera.fov = 42 + jump * 14;
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();
		atmosphereColor.copy(ice).lerp(ion, nebula);
		atmosphereUniforms.uColor.value.copy(atmosphereColor);
		ringUniforms.uColor.value.copy(atmosphereColor);
		ringUniforms.uTime.value = sceneTime;
		ringUniforms.uJump.value = jump;
		starUniforms.uColor.value.copy(atmosphereColor);
		starUniforms.uTime.value = sceneTime;
		starUniforms.uJump.value = jump;
		starUniforms.uTravel.value = travel;
		backdropUniforms.uTime.value = sceneTime;
		backdropUniforms.uNebula.value = nebula;
		earthMaterial.uniforms.uNebula.value = nebula;
		earth.rotation.set(0, -1.95 + sceneTime * 0.025, 0.12);
		clouds.rotation.set(0, -1.92 + sceneTime * 0.032, 0.12);
		orbit.rotation.z = -0.31 + Math.sin(sceneTime * 0.045) * 0.05;
		satellites.forEach((node, i) => {
			const angle = sceneTime * 0.1 + (i * Math.PI) / 3;
			node.position.set(Math.cos(angle) * 4.05, Math.sin(angle) * 4.05, 0);
			node.rotation.set(sceneTime * 0.4, i + sceneTime * 0.2, 0);
		});
		key.color.copy(keyColor).lerp(ion, nebula * 0.3);
		satelliteMaterial.color.copy(atmosphereColor).multiplyScalar(1.8);
		flareMaterial.uniforms.uColor.value.copy(atmosphereColor);
		voyage?.update(step, sceneTime, world.position, world.scale.x);
		orbit.visible = !voyage?.active;
		flare.visible = !voyage?.active;
		camera.updateMatrixWorld();
		lens.uniforms.uTime.value = sceneTime;
		lens.uniforms.uWarp.value = jump;
		lens.uniforms.uFilm.value = voyage?.active ? 1 : 0;
		bloom.strength = (voyage?.active ? 0.3 : 0.42) + jump * 0.25;
		world.updateMatrixWorld(true);
		projectAnchor();
		composer.render(step);
		frames++;
		canvas.dataset.frames = String(frames);
		canvas.dataset.flight = jump > 0.08 ? 'jump' : 'orbit';
		canvas.dataset.palette = nebula.toFixed(2);
	}
	function onFrame(event) {
		render(event.detail, event.detail.dt);
	}
	function onMotion() {
		render(previous, 0);
	}
	function onLighting(event) {
		paletteTarget = event.detail.mode === 'nebula' ? 1 : 0;
		if (body.dataset.motion !== 'on' || body.dataset.heroVisible !== 'true') {
			nebula = paletteTarget;
			render(previous, 0);
		}
	}
	function clearAnchor() {
		['left', 'top', 'right', 'transform'].forEach((p) => beacon.style.removeProperty(p));
	}
	function cleanup() {
		if (disposed) return;
		disposed = true;
		cancelAnimationFrame(redraw);
		resizeObserver?.disconnect();
		controller.dispose();
		voyage?.dispose();
		window.removeEventListener('resize', resize);
		window.removeEventListener('pagehide', onPageHide);
		document.removeEventListener('orbit-frame', onFrame);
		document.removeEventListener('orbit-motion', onMotion);
		document.removeEventListener('orbit-lighting', onLighting);
		resources.forEach((value) => value.dispose?.());
		['scene', 'sceneVersion', 'film', 'motion', 'heroVisible', 'lighting'].forEach(
			(key) => delete body.dataset[key]
		);
		composer?.passes.forEach((pass) => pass.dispose?.());
		composer?.dispose();
		renderer?.dispose();
	}
	function onPageHide(event) {
		if (!event.persisted) cleanup();
	}
	async function start() {
		try {
			renderer = new THREE.WebGLRenderer({
				canvas,
				antialias: true,
				alpha: false,
				powerPreference: 'high-performance'
			});
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1.1;
			// Canvas antialiasing does not apply to the composer's offscreen buffers.
			const target = new THREE.WebGLRenderTarget(1, 1, {
				type: THREE.HalfFloatType,
				samples: Math.min(4, renderer.capabilities.maxSamples)
			});
			composer = new EffectComposer(renderer, target);
			canvas.dataset.samples = String(target.samples);
			composer.addPass(new RenderPass(scene, camera));
			bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.55, 0.8);
			composer.addPass(bloom);
			lens = new ShaderPass({
				uniforms: {
					tDiffuse: { value: null },
					uTime: { value: 0 },
					uWarp: { value: 0 },
					uFilm: { value: 0 }
				},
				vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
				fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uWarp,uFilm;varying vec2 vUv;
        void main(){vec2 p=vUv-.5;vec2 shift=p*dot(p,p)*uWarp*.018;
          vec3 c=texture2D(tDiffuse,vUv).rgb;c.r=texture2D(tDiffuse,vUv+shift).r;c.b=texture2D(tDiffuse,vUv-shift).b;
          c*=1.-dot(p,p)*(.4+uFilm*.35);float grain=fract(sin(dot(vUv+fract(uTime),vec2(12.9898,78.233)))*43758.5453)-.5;
          gl_FragColor=vec4(max(c+grain*.003,0.),1.);}`
			});
			composer.addPass(lens);
			composer.addPass(new OutputPass());
			const voyageLoading = createVoyage({
				scene,
				camera,
				world,
				renderer,
				keep,
				resize,
				isDisposed: () => disposed
			})
				.then((value) => {
					if (disposed) {
						value.dispose();
						return null;
					}
					voyage = value;
					return value;
				})
				.catch(() => null);
			const loader = new THREE.TextureLoader(new THREE.LoadingManager());
			const [day, night, cloudMap, sky] = await Promise.all(
				['earth-day.jpg', 'earth-night.jpg', 'earth-clouds.jpg', 'milky-way.jpg'].map(
					async (file) => {
						const map = await loader.loadAsync(`/orbit/textures/${file}`);
						if (disposed) {
							map.dispose();
							throw new Error('Scene unmounted');
						}
						keep(map);
						map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
						map.wrapS = THREE.RepeatWrapping;
						return map;
					}
				)
			);
			day.colorSpace = night.colorSpace = sky.colorSpace = THREE.SRGBColorSpace;
			backdropUniforms.uMap.value = sky;
			earthMaterial = keep(
				new THREE.ShaderMaterial({
					uniforms: {
						uDay: { value: day },
						uNight: { value: night },
						uSun: { value: sun },
						uNebula: { value: 0 }
					},
					vertexShader: surfaceVertex,
					fragmentShader: `uniform sampler2D uDay,uNight;uniform vec3 uSun;uniform float uNebula;varying vec2 vUv;varying vec3 vNormal,vWorld;
        void main(){vec3 n=normalize(vNormal),view=normalize(cameraPosition-vWorld);float light=dot(n,uSun),daySide=smoothstep(-.14,.24,light);
          vec3 day=texture2D(uDay,vUv).rgb,night=texture2D(uNight,vUv).rgb;
          float ocean=clamp((day.b-day.r)*4.,0.,1.),spec=pow(max(dot(reflect(-uSun,n),view),0.),42.)*ocean;
          vec3 c=day*(.035+max(light,0.)*.94)+night*(1.-daySide)*1.7;c+=vec3(.55,.72,.85)*spec*.5;
          float rim=pow(1.-max(dot(n,view),0.),3.5)*daySide;vec3 air=mix(vec3(.075,.35,.8),vec3(.39,.15,.8),uNebula);
          c+=air*rim*.65;gl_FragColor=vec4(c,1.);}`
				})
			);
			earth = new THREE.Mesh(sphere, earthMaterial);
			globe.add(earth);
			const cloudMaterial = keep(
				new THREE.MeshPhongMaterial({
					color: '#d7e6f7',
					alphaMap: cloudMap,
					transparent: true,
					opacity: 0.32,
					depthWrite: false,
					shininess: 3
				})
			);
			clouds = new THREE.Mesh(sphere, cloudMaterial);
			clouds.scale.setScalar(1.011);
			globe.add(clouds);
			// Finalize lighting and model materials before compiling or revealing anything.
			voyage = await voyageLoading;
			if (disposed) {
				voyage?.dispose();
				return;
			}
			for (const resource of resources) if (resource.isTexture) renderer.initTexture(resource);
			await renderer.compileAsync(scene, camera);
			if (disposed) return;
			resize();
			ready = true;
			// Warm the bloom/output passes while the illustrated fallback is still covering them.
			render(previous, 0);
			body.dataset.sceneVersion = 'earth-cinema';
			canvas.dataset.engine = `three.js r${THREE.REVISION}`;
			document.addEventListener('orbit-frame', onFrame);
			document.addEventListener('orbit-motion', onMotion);
			document.addEventListener('orbit-lighting', onLighting);
			resizeObserver = new ResizeObserver(resize);
			resizeObserver.observe(hero);
			window.addEventListener('resize', resize, { passive: true });
			const playing = await voyage?.start();
			if (disposed) return;
			if (!playing) body.dataset.scene = 'ready';
			canvas.addEventListener('webglcontextlost', (event) => {
				event.preventDefault();
				lost = true;
				voyage?.cancel();
				body.dataset.scene = 'fallback';
				clearAnchor();
			});
			canvas.addEventListener('webglcontextrestored', () => {
				lost = false;
				resize();
				body.dataset.scene = 'ready';
			});
			window.addEventListener('pagehide', onPageHide);
		} catch (error) {
			if (disposed) return;
			body.dataset.scene = 'fallback';
			clearAnchor();
			cleanup();
			console.warn(
				'The cinematic scene is unavailable; the illustrated scene remains active.',
				error
			);
		}
	}
	void start();
	return cleanup;
}
