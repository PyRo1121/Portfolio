import { describe, expect, it } from 'vitest';
import {
	createOwnerProjectNavigationSignal,
	createPublicShippingNavigationSignal
} from './owner-project-navigation';

describe('owner project navigation signal', () => {
	it('shows the persisted project count without falling back to repository activity', () => {
		expect(createOwnerProjectNavigationSignal({ projects: [] })).toEqual({
			value: '0',
			label: 'projects',
			tone: 'neutral'
		});
	});

	it('keeps missing owner storage visibly pending', () => {
		expect(createOwnerProjectNavigationSignal(null)).toEqual({
			value: '—',
			label: 'pending',
			tone: 'neutral'
		});
	});
});

describe('createPublicShippingNavigationSignal', () => {
	it('counts public shipping projects without using the owner registry', () => {
		expect(
			createPublicShippingNavigationSignal({
				_tag: 'Current',
				reason: 'Public shipping links.',
				projects: [
					{
						id: 'one',
						name: 'One',
						description: 'Ship',
						links: [],
						deployments: []
					}
				]
			})
		).toEqual({ value: '1', label: 'projects', tone: 'neutral' });
	});
});
