import type { CareerStory } from './career-accountability';

/** Sanitized Markdown generated only from stories explicitly marked ShareDraft. */
export type CareerPortfolioExport = {
	readonly body: string;
	readonly storyCount: number;
	readonly filename: string;
};

const MARKDOWN_CONTROL_CHARACTERS = new Set<string>([
	'`',
	'*',
	'_',
	'{',
	'}',
	'[',
	']',
	'(',
	')',
	'#',
	'+',
	'.',
	'!',
	'|'
]);

function escapedMarkdown(value: string): string {
	let escaped = '';
	for (const character of value) {
		if (character === '&') escaped += '&amp;';
		else if (character === '<') escaped += '&lt;';
		else if (character === '>') escaped += '&gt;';
		else if (character === '\\' || MARKDOWN_CONTROL_CHARACTERS.has(character)) {
			escaped += `\\${character}`;
		} else escaped += character;
	}
	return escaped;
}

function inlineMarkdown(value: string): string {
	return escapedMarkdown(value.replace(/\s+/g, ' ').trim());
}

function safeEvidenceUrl(value: string | null): string | null {
	if (value === null) return null;
	const parsed = URL.parse(value);
	return parsed !== null && (parsed.protocol === 'https:' || parsed.protocol === 'http:')
		? parsed.toString()
		: null;
}

function storyMarkdown(story: CareerStory): string {
	const evidenceUrl = safeEvidenceUrl(story.evidenceUrl);
	return [
		`## ${inlineMarkdown(story.title)}`,
		'',
		'**Problem**',
		escapedMarkdown(story.problem),
		'',
		'**Action**',
		escapedMarkdown(story.action),
		'',
		'**Outcome**',
		escapedMarkdown(story.outcome),
		...(evidenceUrl === null ? [] : ['', `[Evidence](${evidenceUrl})`])
	].join('\n');
}

/** Build a privacy-bounded portfolio draft without owner, pipeline, commitment, or private-story data. */
export function createCareerPortfolioMarkdown(
	stories: ReadonlyArray<CareerStory>,
	generatedAt: Date
): CareerPortfolioExport {
	const shareDrafts = stories.filter((story) => story.visibility === 'ShareDraft');
	const sections = shareDrafts.map(storyMarkdown);
	return {
		body: [
			'# Product engineering story draft',
			'',
			`Generated ${generatedAt.toISOString()} from stories explicitly marked ShareDraft.`,
			'',
			'> Review this draft before sharing. Private stories and Career pipeline records are excluded.',
			...(sections.length === 0
				? ['', '_No stories are currently marked ShareDraft._']
				: ['', ...sections]),
			''
		].join('\n'),
		storyCount: shareDrafts.length,
		filename: 'weeknote-portfolio-draft.md'
	};
}
