import { describe, expect, it } from 'vitest';
import {
	ownerWorkspaceDefinitions,
	publicWorkspaceDefinitions,
	shortcutMapFor
} from './dashboard-workspace';

describe('audience workspace definitions', () => {
	it('lists the six public portfolio workspaces and excludes owner areas', () => {
		expect(publicWorkspaceDefinitions.map((workspace) => workspace.id)).toEqual([
			'today',
			'brief',
			'delivery',
			'craft',
			'repositories',
			'activity'
		]);
		expect(publicWorkspaceDefinitions.map((workspace) => workspace.shortcut)).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
			'6'
		]);
		expect(publicWorkspaceDefinitions.find((workspace) => workspace.id === 'craft')).toMatchObject({
			label: 'Checks',
			description: 'Latest workflow state, recovery, history, and change context'
		});
	});

	it('lists owner briefing and ops areas without shipping workspaces', () => {
		expect(ownerWorkspaceDefinitions.map((workspace) => workspace.id)).toEqual([
			'briefing',
			'career',
			'cloudflare',
			'telemetry',
			'mappings'
		]);
		expect(ownerWorkspaceDefinitions.some((workspace) => workspace.id === 'brief')).toBe(false);
	});

	it('builds shortcut maps only from the active audience list', () => {
		const publicShortcuts = shortcutMapFor(publicWorkspaceDefinitions);
		expect(publicShortcuts['7']).toBeUndefined();
		expect(publicShortcuts['8']).toBeUndefined();
		expect(publicShortcuts['9']).toBeUndefined();
		expect(publicShortcuts['1']).toBe('today');

		const ownerShortcuts = shortcutMapFor(ownerWorkspaceDefinitions);
		expect(ownerShortcuts['1']).toBe('briefing');
		expect(ownerShortcuts['5']).toBe('mappings');
		expect(ownerShortcuts['6']).toBeUndefined();
	});
});
