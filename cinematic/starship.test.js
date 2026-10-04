import { describe, expect, it } from 'vitest';
import {
	createStarship,
	launchPose,
	starbaseDirection,
	createLaunchTrajectory,
	orbitalPoint,
	orbitalTangent
} from './starship.js';

describe('Starbase launch', () => {
	it('joins orbit without a position or heading snap and starts above the surface', () => {
		const path = createLaunchTrajectory();
		expect(path.getPoint(1).distanceTo(orbitalPoint(0))).toBeLessThan(0.00001);
		expect(path.getTangent(1).angleTo(orbitalTangent(0))).toBeLessThan(0.001);
		const engineBase = path.getPoint(0).addScaledVector(path.getTangent(0), -2.44 * 0.16);
		expect(engineBase.length()).toBeGreaterThan(3.05);
		for (let progress = 0; progress <= 1; progress += 0.01)
			expect(path.getPoint(progress).length()).toBeGreaterThan(3.1);
	});
	it('ignites before ascent, separates in flight, and shuts off exhaust in orbit', () => {
		expect(launchPose(0)).toEqual({ ascent: 0, separation: 0, ignition: 0, turn: 0 });
		expect(launchPose(0.1).ignition).toBe(1);
		expect(launchPose(0.1).ascent).toBe(0);
		expect(launchPose(0.6).separation).toBeGreaterThan(0);
		expect(launchPose(0.6).ascent).toBeGreaterThan(0.5);
		expect(launchPose(1)).toEqual({ ascent: 1, separation: 1, ignition: 0, turn: 1 });
	});
	it('keeps every animation channel bounded at timeline edges', () => {
		for (const progress of [-1, 0, 0.12, 0.52, 0.7, 0.9, 1, 2]) {
			for (const value of Object.values(launchPose(progress))) {
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThanOrEqual(1);
			}
		}
	});
	it('places Starbase on the visible northern hemisphere at ignition', () => {
		const direction = starbaseDirection(-0.3);
		expect(direction.length()).toBeCloseTo(1);
		expect(direction.y).toBeGreaterThan(0.3);
		expect(direction.z).toBeGreaterThan(0.7);
		expect(direction.x).toBeLessThan(0);
	});
	it('uses a small original model with shared resources and a separable booster', () => {
		const resources = new Set();
		const { vehicle, booster, plumeMaterial } = createStarship((value) => {
			resources.add(value);
			return value;
		});
		let draws = 0,
			triangles = 0;
		vehicle.traverse((node) => {
			if (!node.isMesh) return;
			draws++;
			const count = node.geometry.index?.count ?? node.geometry.attributes.position.count;
			triangles += (count / 3) * (node.isInstancedMesh ? node.count : 1);
			expect(resources.has(node.geometry)).toBe(true);
			expect(resources.has(node.material)).toBe(true);
		});
		expect(draws).toBeLessThanOrEqual(12);
		expect(triangles).toBeLessThan(15000);
		expect(booster.parent).toBe(vehicle);
		expect(plumeMaterial.depthWrite).toBe(false);
		resources.forEach((value) => value.dispose?.());
	});
});
