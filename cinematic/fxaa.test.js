import { expect, it } from 'vitest';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { CinematicFXAAShader } from './fxaa.js';

it('samples the compositor base level while preserving the upstream FXAA algorithm', () => {
	const sample = 'return texture( tex2D, uv );';
	expect(FXAAShader.fragmentShader.split(sample)).toHaveLength(2);
	expect(CinematicFXAAShader.fragmentShader).toContain('return textureLod( tex2D, uv, 0.0 );');
	expect(
		CinematicFXAAShader.fragmentShader.replace('return textureLod( tex2D, uv, 0.0 );', sample)
	).toBe(FXAAShader.fragmentShader);
	expect(CinematicFXAAShader.vertexShader).toBe(FXAAShader.vertexShader);
	expect(CinematicFXAAShader.uniforms).toBe(FXAAShader.uniforms);
});
