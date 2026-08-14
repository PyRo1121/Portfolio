import type { EngineeringDay } from './github-intelligence';

/** One extrusion in the weekly change-mass terrain. */
export type ChangeTerrainColumn = {
	readonly id: string;
	readonly position: [number, number, number];
	readonly scale: [number, number, number];
	readonly color: string;
	readonly emissiveIntensity: number;
};

/** Project daily additions and deletions into a compact 3D terrain. */
export function buildChangeTerrain(
	days: ReadonlyArray<EngineeringDay>
): ReadonlyArray<ChangeTerrainColumn> {
	const maximum = Math.max(1, ...days.map((day) => day.totalChanges));
	return days.flatMap((day, index) => {
		const totalRatio = day.totalChanges / maximum;
		const additionsRatio = day.totalChanges === 0 ? 0 : day.additions / day.totalChanges;
		const baseHeight = Math.max(0.06, totalRatio * 2.5);
		const x = index - (days.length - 1) / 2;
		return [
			{
				id: `${day.date}-add`,
				position: [x * 0.72, baseHeight / 2 - 0.9, 0.22],
				scale: [0.48, Math.max(0.06, baseHeight * additionsRatio), 0.48],
				color: '#d8a54a',
				emissiveIntensity: 0.14 + totalRatio * 0.2
			},
			{
				id: `${day.date}-delete`,
				position: [x * 0.72, (baseHeight * (1 - additionsRatio)) / 2 - 0.9, -0.34],
				scale: [0.48, Math.max(0.06, baseHeight * (1 - additionsRatio)), 0.48],
				color: '#686d65',
				emissiveIntensity: 0.06
			}
		];
	});
}
