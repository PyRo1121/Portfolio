import { describe, expect, it } from 'vitest';
import { createOwnerProjectNavigationSignal } from './owner-project-navigation';

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
