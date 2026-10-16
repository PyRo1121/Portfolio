import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export const CinematicFXAAShader = {
	...FXAAShader,
	fragmentShader: FXAAShader.fragmentShader.replace(
		'return texture( tex2D, uv );',
		'return textureLod( tex2D, uv, 0.0 );'
	)
};
