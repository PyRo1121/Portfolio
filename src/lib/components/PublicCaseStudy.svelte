<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowUpRightIcon as ArrowUpRight } from 'phosphor-svelte';
	import type { PublicCaseStudy } from '$lib/domain/public-case-study';
	import { publicCaseStudyFor } from '$lib/domain/public-case-study';
	import {
		PUBLIC_GITHUB_URL,
		PUBLIC_SITE_ORIGIN,
		PUBLIC_SOCIAL_IMAGE_URL,
		caseStudySeo,
		jsonLdScriptTag
	} from '$lib/domain/public-seo';

	type Props = {
		readonly study: PublicCaseStudy;
	};

	let { study }: Props = $props();
	const canonical = $derived(`${PUBLIC_SITE_ORIGIN}/work/${study.slug}`);
	const seo = $derived(caseStudySeo(study));
	const pageTitle = $derived(seo.title);
	const nextStudy = $derived(publicCaseStudyFor(study.slug === 'omg' ? 'weeknote' : 'omg'));
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={study.summary} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="latham.cloud" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={study.summary} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Olen Latham — software, systems, and cloud work" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={study.summary} />
	<meta name="twitter:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta name="twitter:image:alt" content="Olen Latham — software, systems, and cloud work" />
	<!-- JSON-LD is serialized from local constants, not untrusted input. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(seo.jsonLd)}
</svelte:head>

<a class="skip-link" href="#case-study-content">Skip to case study</a>

<main id="case-study-content" class="case-study" tabindex="-1">
	<nav class="topline" aria-label="Page navigation">
		<a href={resolve('/')}><span aria-hidden="true">←</span> Portfolio</a>
		<a href={`${PUBLIC_GITHUB_URL}/Portfolio`} target="_blank" rel="external noreferrer">Source</a>
	</nav>

	<header class="hero">
		<p>{study.eyebrow}</p>
		<h1>{study.title}</h1>
		<div class="hero-summary">
			<p>{study.summary}</p>
			<ul aria-label="Tools and topics">
				{#each study.tools as tool (tool)}
					<li>{tool}</li>
				{/each}
			</ul>
		</div>
	</header>

	<article class="story">
		<aside aria-label="Case study sections">
			<span>{study.slug === 'omg' ? 'Developer tooling' : 'Public portfolio'}</span>
			<p>A problem, the work, the difficult parts, and what exists today.</p>
		</aside>
		<div class="story-sections">
			<section aria-labelledby={`${study.slug}-problem`}>
				<h2 id={`${study.slug}-problem`}>The problem</h2>
				<p>{study.problem}</p>
			</section>
			<section aria-labelledby={`${study.slug}-work`}>
				<h2 id={`${study.slug}-work`}>What I built</h2>
				<p>{study.work}</p>
			</section>
			<section aria-labelledby={`${study.slug}-difficulty`}>
				<h2 id={`${study.slug}-difficulty`}>What was hard</h2>
				<p>{study.difficulty}</p>
			</section>
			<section aria-labelledby={`${study.slug}-result`}>
				<h2 id={`${study.slug}-result`}>Where it stands</h2>
				<p>{study.result}</p>
			</section>
		</div>
	</article>

	<blockquote>
		<p>{study.reflection}</p>
	</blockquote>

	<section class="evidence" aria-labelledby={`${study.slug}-evidence`}>
		<header>
			<h2 id={`${study.slug}-evidence`}>Evidence</h2>
			<p>Direct links for checking the work instead of taking the summary on faith.</p>
		</header>
		<div class="evidence-list">
			{#each study.evidence as item (item.href)}
				<a href={item.href} target="_blank" rel="external noreferrer">
					<span>{item.label}<ArrowUpRight size={15} weight="bold" /></span>
					<small>{item.note}</small>
				</a>
			{/each}
		</div>
	</section>

	<section class="next-study" aria-label="Next case study">
		<span>Keep reading</span>
		{#if nextStudy.slug === 'omg'}
			<a href={resolve('/work/omg')}>
				{nextStudy.title}<ArrowUpRight size={15} weight="bold" />
			</a>
		{:else}
			<a href={resolve('/work/weeknote')}>
				{nextStudy.title}<ArrowUpRight size={15} weight="bold" />
			</a>
		{/if}
	</section>

	<footer>
		<div>
			<p>Looking for someone who brings customer-service follow-through to technical work?</p>
			<strong>I’m open to IT support, cloud operations, junior systems, and software roles.</strong>
		</div>
		<a href={resolve('/about#contact')}>Contact Olen <ArrowUpRight size={15} weight="bold" /></a>
	</footer>
</main>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		min-height: 100%;
		background: #0b0d0e;
		color: #f0f0eb;
		font-family: 'Geist Variable', sans-serif;
		overflow: auto;
	}
	:global(*) {
		box-sizing: border-box;
	}
	.case-study {
		width: min(100% - 3rem, 74rem);
		min-height: 100dvh;
		margin: 0 auto;
		padding: 1.25rem 0 3rem;
	}
	.topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 3rem;
		border-bottom: 1px solid rgb(231 232 225 / 16%);
		font:
			600 0.65rem/1 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.topline a,
	.evidence a,
	footer a {
		color: inherit;
		text-decoration: none;
	}
	.topline a:last-child {
		color: #808580;
	}
	.topline span,
	.hero > p {
		color: #d8a54a;
	}
	.hero {
		padding: clamp(4rem, 10vw, 8rem) 0 clamp(4rem, 8vw, 6rem);
	}
	.hero > p {
		margin: 0 0 1.5rem;
		font:
			650 0.68rem/1.2 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	h1 {
		max-width: 14ch;
		margin: 0;
		font-size: clamp(3.7rem, 7vw, 7rem);
		font-weight: 680;
		line-height: 0.91;
		letter-spacing: -0.065em;
		text-wrap: balance;
	}
	.hero-summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.55fr);
		gap: clamp(2rem, 7vw, 6rem);
		align-items: end;
		margin-top: 2.75rem;
	}
	.hero-summary > p {
		max-width: 44rem;
		margin: 0;
		color: #b2b6b1;
		font-size: clamp(1.05rem, 1.8vw, 1.3rem);
		line-height: 1.55;
		text-wrap: pretty;
	}
	.hero-summary ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem 0.9rem;
		margin: 0;
		padding: 0;
		color: #808580;
		font:
			500 0.62rem/1.4 'JetBrains Mono Variable',
			monospace;
		list-style: none;
	}
	.story {
		display: grid;
		grid-template-columns: minmax(12rem, 0.5fr) minmax(0, 1.5fr);
		gap: clamp(3rem, 9vw, 8rem);
		padding: clamp(4rem, 8vw, 7rem) 0;
		border-top: 1px solid rgb(231 232 225 / 16%);
	}
	.story > aside {
		align-self: start;
		position: sticky;
		top: 2rem;
	}
	.story > aside span {
		color: #d8a54a;
		font:
			650 0.65rem/1.2 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.story > aside p {
		max-width: 16rem;
		margin: 1rem 0 0;
		color: #808580;
		font-size: 0.82rem;
		line-height: 1.5;
	}
	.story-sections section {
		display: grid;
		grid-template-columns: minmax(9rem, 0.45fr) minmax(0, 1fr);
		gap: clamp(1.5rem, 4vw, 4rem);
		padding: 2rem 0;
		border-top: 1px solid rgb(231 232 225 / 16%);
	}
	.story-sections section:first-child {
		padding-top: 0;
		border-top: 0;
	}
	h2,
	.story-sections p {
		margin: 0;
	}
	h2 {
		font-size: clamp(1.35rem, 2.3vw, 2rem);
		line-height: 1;
		letter-spacing: -0.04em;
	}
	.story-sections p {
		color: #b2b6b1;
		font-size: 1rem;
		line-height: 1.7;
		text-wrap: pretty;
	}
	blockquote {
		margin: 0;
		padding: clamp(3rem, 7vw, 6rem) clamp(1.5rem, 8vw, 7rem);
		border-top: 1px solid #d8a54a;
		border-bottom: 1px solid rgb(231 232 225 / 16%);
		background: rgb(216 165 74 / 4%);
	}
	blockquote p {
		max-width: 31ch;
		margin: 0;
		font-size: clamp(1.8rem, 4vw, 3.5rem);
		font-weight: 620;
		line-height: 1.08;
		letter-spacing: -0.045em;
		text-wrap: balance;
	}
	.evidence {
		padding: clamp(4rem, 8vw, 7rem) 0;
	}
	.evidence > header {
		display: grid;
		grid-template-columns: minmax(9rem, 0.45fr) minmax(0, 1fr);
		gap: 2rem;
	}
	.evidence > header p {
		max-width: 34rem;
		margin: 0;
		color: #808580;
		line-height: 1.55;
	}
	.evidence-list {
		margin-top: 2.75rem;
		border-bottom: 1px solid rgb(231 232 225 / 16%);
	}
	.evidence-list a {
		display: grid;
		grid-template-columns: minmax(10rem, 0.55fr) minmax(0, 1fr);
		gap: 2rem;
		padding: 1.25rem 0;
		border-top: 1px solid rgb(231 232 225 / 16%);
	}
	.evidence-list span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.86rem;
		font-weight: 650;
	}
	.evidence-list small {
		color: #808580;
		font-size: 0.78rem;
		line-height: 1.45;
	}
	.next-study {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 2.75rem;
		padding: 1.25rem 0;
		border-top: 1px solid rgb(231 232 225 / 16%);
	}
	.next-study span {
		color: #808580;
		font:
			600 0.62rem/1 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.next-study a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: #d8a54a;
		font-size: clamp(1rem, 1.7vw, 1.25rem);
		font-weight: 650;
		line-height: 1.2;
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgb(231 232 225 / 16%);
	}
	footer p {
		margin: 0 0 0.45rem;
		color: #808580;
		font-size: 0.8rem;
	}
	footer strong {
		display: block;
		max-width: 42rem;
		font-size: clamp(1rem, 1.7vw, 1.25rem);
		line-height: 1.35;
		text-wrap: balance;
	}
	footer a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: #d8a54a;
		font-size: 0.82rem;
		font-weight: 650;
	}
	a:hover {
		color: #d8a54a;
	}
	a:focus-visible {
		outline: 2px solid #d8a54a;
		outline-offset: 4px;
	}
	@media (max-width: 760px) {
		.case-study {
			width: min(100% - 2rem, 40rem);
			padding-top: 0.75rem;
		}
		.hero {
			padding: 3.5rem 0;
		}
		h1 {
			font-size: clamp(3rem, 14vw, 4.5rem);
		}
		.hero-summary,
		.story,
		.story-sections section,
		.evidence > header,
		.evidence-list a {
			grid-template-columns: 1fr;
		}
		.hero-summary {
			gap: 1.5rem;
			margin-top: 2rem;
		}
		.story {
			gap: 2.5rem;
		}
		.story > aside {
			position: static;
		}
		.story-sections section {
			gap: 0.9rem;
		}
		.evidence > header,
		.evidence-list a {
			gap: 0.75rem;
		}
		.next-study {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.75rem;
		}
		footer {
			align-items: flex-start;
			flex-direction: column;
		}
	}
	@media (max-width: 400px) {
		.topline a:last-child {
			display: none;
		}
		h1 {
			font-size: clamp(2.8rem, 14vw, 3.5rem);
		}
	}
</style>
