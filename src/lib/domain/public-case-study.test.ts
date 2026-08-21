import { describe, expect, it } from 'vitest';
import {
	PUBLIC_CASE_STUDIES,
	publicCaseStudyPaths,
	type PublicCaseStudy
} from './public-case-study';

describe('public recruiter case studies', () => {
	it('publishes stable routes for OMG and Weeknote', () => {
		expect(publicCaseStudyPaths).toEqual(['/work/omg', '/work/weeknote']);
		expect(PUBLIC_CASE_STUDIES.map((study: PublicCaseStudy) => study.slug)).toEqual([
			'omg',
			'weeknote'
		]);
	});

	it('uses specific problem, work, difficulty, result, and evidence sections', () => {
		for (const study of PUBLIC_CASE_STUDIES) {
			expect(study.problem.length).toBeGreaterThan(40);
			expect(study.work.length).toBeGreaterThan(40);
			expect(study.difficulty.length).toBeGreaterThan(40);
			expect(study.result.length).toBeGreaterThan(40);
			expect(study.evidence.length).toBeGreaterThanOrEqual(2);
		}
	});

	it('does not publish unsupported OMG marketing claims', () => {
		const copy = JSON.stringify(PUBLIC_CASE_STUDIES).toLocaleLowerCase();
		expect(copy).not.toContain('fastest');
		expect(copy).not.toContain('enterprise-secure');
		expect(copy).not.toContain('saves $');
		expect(copy).not.toContain('pyro1121.com');
	});
});
