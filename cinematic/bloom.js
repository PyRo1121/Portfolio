import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class CinematicBloomPass extends UnrealBloomPass {
	resolutionScale = 1;

	setSize(width, height) {
		const scale = this.resolutionScale ?? 1;
		super.setSize(width * scale, height * scale);
	}
}
