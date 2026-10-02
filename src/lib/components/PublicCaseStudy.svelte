<script lang="ts">
	import PublicShell from '$lib/components/PublicShell.svelte';
	import { asset, resolve } from '$app/paths';
	import { ArrowUpRightIcon as ArrowUpRight } from 'phosphor-svelte';
	import PublicSeoHead from '$lib/components/PublicSeoHead.svelte';
	import type { PublicCaseStudy } from '$lib/domain/public-case-study';
	import { PUBLIC_CONTACT_MAILTO, caseStudySeo } from '$lib/domain/public-seo';
	import { loadClientTelemetry } from '$lib/telemetry/telemetry-gate';
	import type { ClientTelemetry } from '$lib/telemetry/client-telemetry';

	type Props = {
		readonly study: PublicCaseStudy;
	};

	let { study }: Props = $props();
	const seo = $derived(caseStudySeo(study));
	const resumeUrl = asset('/olen-latham-resume.pdf');
	const visualUrl = $derived(asset(study.visual.imagePath));
	let clientTelemetry = $state<ClientTelemetry | null>(null);
	loadClientTelemetry().then((loaded) => (clientTelemetry = loaded));
	const productAction = $derived(study.slug === 'omg' ? 'omg_site_open' : 'deploylint_site_open');
</script>

<PublicSeoHead {seo} />

<PublicShell>
	<a class="skip-link" href="#case-study-content">Skip to case study</a>

	<main id="case-study-content" class="case-study" tabindex="-1">
		<nav class="topline" aria-label="Page navigation">
			<a href={resolve('/')}><span aria-hidden="true">←</span> Back to orbit</a>
			<a href={study.evidence[0].href} target="_blank" rel="external noopener">
				{study.slug === 'omg' ? 'Source' : 'Live product'}
			</a>
		</nav>

		<header class="hero">
			<p>{study.eyebrow}</p>
			<h1>{study.title}</h1>
			<p class="byline">
				By <a href={resolve('/about')}>Olen Latham</a>, software developer. Updated
				<time datetime={seo.modified}>{seo.modified}</time>.
			</p>
			<div class="hero-summary">
				<p>{study.summary}</p>
				<ul aria-label="Tools and topics">
					{#each study.tools as tool (tool)}
						<li>{tool}</li>
					{/each}
				</ul>
			</div>
			<div class="hero-links">
				<a
					class="primary-link"
					href={study.websiteUrl}
					target="_blank"
					rel="external noopener"
					onclick={() => clientTelemetry?.recordPortfolioAction(productAction)}
				>
					Visit {study.slug === 'omg' ? 'OMG' : 'DeployLint'}
					<ArrowUpRight size={16} weight="bold" />
				</a>
				<a href={`#${study.slug}-evidence`}>See the evidence ↓</a>
			</div>
		</header>

		<article class="story">
			<aside aria-label="Case study sections">
				<span>{study.slug === 'omg' ? 'Developer tooling' : 'CI/CD product'}</span>
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

		<section class="engineering" aria-labelledby={`${study.slug}-engineering`}>
			<h2 id={`${study.slug}-engineering`}>Engineering decisions</h2>
			{#each study.engineeringNotes as note (note.heading)}
				<section>
					<h3>{note.heading}</h3>
					<p>{note.body}</p>
					<a href={note.href} target="_blank" rel="external noopener">
						{note.linkLabel}
						<ArrowUpRight size={15} weight="bold" />
					</a>
				</section>
			{/each}
		</section>

		<section class="workflow" aria-labelledby={`${study.slug}-workflow`}>
			<header>
				<p>Product workflow</p>
				<h2 id={`${study.slug}-workflow`}>
					What using {study.slug === 'omg' ? 'OMG' : 'DeployLint'} looks like
				</h2>
				<span>{study.workflowIntro}</span>
			</header>
			<ol>
				{#each study.workflowSteps as step (step.label)}
					<li>
						<span>{step.label}</span>
						<strong class:command={study.slug === 'omg'}>{step.action}</strong>
						<p>{step.outcome}</p>
					</li>
				{/each}
			</ol>
			<a
				href={study.slug === 'omg' ? 'https://getomg.xyz/docs/cli' : 'https://deploylint.com/start'}
				target="_blank"
				rel="external noopener"
				onclick={() => clientTelemetry?.recordPortfolioAction(productAction)}
			>
				{study.slug === 'omg' ? 'Explore the OMG CLI docs' : 'Try a repository assessment'}
				<ArrowUpRight size={15} weight="bold" />
			</a>
		</section>

		<section class="product-screen" aria-labelledby={`${study.slug}-screen`}>
			<div class="screen-heading">
				<div>
					<p>Public page</p>
					<h2 id={`${study.slug}-screen`}>What the public site shows</h2>
				</div>
				<a href={study.visual.pageUrl} target="_blank" rel="external noopener">
					{study.visual.linkLabel}
					<ArrowUpRight size={15} weight="bold" />
				</a>
			</div>
			<figure>
				<img src={visualUrl} alt={study.visual.alt} width="1440" height="1000" loading="lazy" />
				<figcaption>{study.visual.caption}</figcaption>
			</figure>
		</section>

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
					<a
						href={item.href}
						target="_blank"
						rel="external noopener"
						onclick={() => clientTelemetry?.recordPortfolioAction('live_evidence_open')}
					>
						<span>{item.label}<ArrowUpRight size={15} weight="bold" /></span>
						<small>{item.note}</small>
					</a>
				{/each}
			</div>
		</section>

		<nav class="more-work" aria-label="More selected work">
			<span>More selected work</span>
			<a href={resolve(study.slug === 'omg' ? '/work/deploylint' : '/work/omg')}>
				Explore the {study.slug === 'omg' ? 'DeployLint' : 'OMG'} case study
				<ArrowUpRight size={15} weight="bold" />
			</a>
		</nav>

		<footer>
			<div>
				<p>Interested in the engineering behind these tools?</p>
				<strong
					>I’m open to software developer and developer tools roles, with cloud and IT work also in
					scope.</strong
				>
			</div>
			<div class="footer-actions">
				<a
					href={PUBLIC_CONTACT_MAILTO}
					rel="external"
					onclick={() => clientTelemetry?.recordContact('email_case_study')}
					>Email Olen <ArrowUpRight size={15} weight="bold" /></a
				>
				<a
					href={resumeUrl}
					download
					onclick={() => clientTelemetry?.recordPortfolioAction('resume_download')}
					>Download résumé <ArrowUpRight size={15} weight="bold" /></a
				>
			</div>
		</footer>
	</main>
</PublicShell>

<style>
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
		border-bottom: 1px solid var(--line);
		font:
			600 0.65rem/1 'Geist Variable',
			monospace;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.topline a,
	.evidence a,
	.more-work a,
	footer a {
		color: inherit;
		text-decoration: none;
	}
	.topline a:last-child {
		color: var(--faint);
	}
	.topline span,
	.hero > p {
		color: var(--accent);
	}
	.hero {
		padding: clamp(4rem, 10vw, 8rem) 0 clamp(4rem, 8vw, 6rem);
	}
	.hero > p:not(.byline) {
		margin: 0 0 1.5rem;
		font:
			650 0.68rem/1.2 'Geist Variable',
			monospace;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	h1 {
		font-family: var(--display);
		font-weight: 400;
		max-width: 14ch;
		margin: 0;
		font-size: clamp(3.7rem, 7vw, 7rem);
		font-weight: 400;
		line-height: 0.91;
		letter-spacing: -0.025em;
		text-wrap: balance;
	}
	.hero .byline {
		margin: 1.5rem 0 0;
		color: var(--muted);
		font-size: 0.82rem;
		line-height: 1.6;
	}
	.byline a,
	.engineering a {
		color: var(--accent);
	}
	.engineering {
		padding: clamp(3rem, 6vw, 5rem) 0;
		border-top: 1px solid var(--line);
	}
	.engineering section {
		max-width: 48rem;
		margin-top: 2rem;
	}
	.engineering h3 {
		font-size: 1.2rem;
		line-height: 1.3;
	}
	.engineering p {
		color: var(--muted);
		font-size: 1rem;
		line-height: 1.7;
	}
	.engineering a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
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
		color: var(--muted);
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
		color: var(--faint);
		font:
			500 0.62rem/1.4 'Geist Variable',
			monospace;
		list-style: none;
	}
	.hero-links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem 1.5rem;
		margin-top: 2rem;
	}
	.hero-links a {
		display: inline-flex;
		min-height: 2.9rem;
		align-items: center;
		gap: 0.45rem;
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 650;
		text-decoration: none;
	}
	.hero-links .primary-link {
		padding: 0 1rem;
		background: var(--accent);
		color: var(--bg);
	}
	.hero-links .primary-link:hover {
		background: #c5f2ff;
	}
	.story {
		display: grid;
		grid-template-columns: minmax(12rem, 0.5fr) minmax(0, 1.5fr);
		gap: clamp(3rem, 9vw, 8rem);
		padding: clamp(4rem, 8vw, 7rem) 0;
		border-top: 1px solid var(--line);
	}
	.story > aside {
		align-self: start;
		position: sticky;
		top: 2rem;
	}
	.story > aside span {
		color: var(--accent);
		font:
			650 0.65rem/1.2 'Geist Variable',
			monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.story > aside p {
		max-width: 16rem;
		margin: 1rem 0 0;
		color: var(--faint);
		font-size: 0.82rem;
		line-height: 1.5;
	}
	.story-sections section {
		display: grid;
		grid-template-columns: minmax(9rem, 0.45fr) minmax(0, 1fr);
		gap: clamp(1.5rem, 4vw, 4rem);
		padding: 2rem 0;
		border-top: 1px solid var(--line);
	}
	.story-sections section:first-child {
		padding-top: 0;
		border-top: 0;
	}
	h2,
	.story-sections p {
		margin: 0;
	}
	.workflow {
		padding: clamp(3rem, 6vw, 5rem) 0;
		border-top: 1px solid var(--line);
	}
	.workflow header {
		max-width: 48rem;
	}
	.workflow header > p,
	.workflow li > span {
		color: var(--accent);
		font:
			650 0.65rem/1.3 'Geist Variable',
			monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.workflow header h2 {
		margin: 0.8rem 0 1rem;
		font-size: clamp(1.8rem, 3.2vw, 3rem);
	}
	.workflow header > span {
		color: var(--muted);
		line-height: 1.6;
	}
	.workflow ol {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		margin: 2.5rem 0 1.5rem;
		padding: 1px;
		background: var(--line);
		list-style: none;
	}
	.workflow li {
		min-width: 0;
		padding: clamp(1.3rem, 3vw, 2rem);
		background: var(--surface);
	}
	.workflow li strong {
		display: block;
		margin: 0.9rem 0;
		font-size: 1rem;
	}
	.workflow li strong.command {
		font-family: 'Geist Variable', monospace;
		font-size: 0.88rem;
		overflow-wrap: anywhere;
	}
	.workflow li p {
		margin: 0;
		color: var(--muted);
		font-size: 0.85rem;
		line-height: 1.55;
	}
	.workflow > a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 650;
		text-decoration: none;
	}
	.product-screen {
		padding: clamp(3rem, 6vw, 5rem) 0;
		border-top: 1px solid var(--line);
	}
	.screen-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}
	.screen-heading p {
		margin: 0 0 0.65rem;
		color: var(--accent);
		font:
			650 0.65rem/1.3 'Geist Variable',
			monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.screen-heading a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 650;
		text-decoration: none;
	}
	.product-screen figure {
		margin: 0;
		border: 1px solid var(--line);
		background: var(--surface);
	}
	.product-screen img {
		display: block;
		width: 100%;
		height: auto;
	}
	.product-screen figcaption {
		padding: 0.85rem 1rem;
		border-top: 1px solid var(--line);
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.5;
	}
	h2 {
		font-size: clamp(1.35rem, 2.3vw, 2rem);
		line-height: 1;
		letter-spacing: -0.04em;
	}
	.story-sections p {
		color: var(--muted);
		font-size: 1rem;
		line-height: 1.7;
		text-wrap: pretty;
	}
	blockquote {
		margin: 0;
		padding: clamp(3rem, 7vw, 6rem) clamp(1.5rem, 8vw, 7rem);
		border-top: 1px solid var(--accent);
		border-bottom: 1px solid var(--line);
		background: #9ae7ff05;
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
		color: var(--faint);
		line-height: 1.55;
	}
	.evidence-list {
		margin-top: 2.75rem;
		border-bottom: 1px solid var(--line);
	}
	.evidence-list a {
		display: grid;
		grid-template-columns: minmax(10rem, 0.55fr) minmax(0, 1fr);
		gap: 2rem;
		padding: 1.25rem 0;
		border-top: 1px solid var(--line);
	}
	.evidence-list span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.86rem;
		font-weight: 650;
	}
	.evidence-list small {
		color: var(--faint);
		font-size: 0.78rem;
		line-height: 1.45;
	}
	.more-work {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.5rem 0;
		border-top: 1px solid var(--line);
	}
	.more-work span {
		color: var(--faint);
		font:
			600 0.65rem/1.3 'Geist Variable',
			monospace;
		text-transform: uppercase;
	}
	.more-work a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 650;
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--line);
	}
	footer p {
		margin: 0 0 0.45rem;
		color: var(--faint);
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
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 650;
	}
	.footer-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem 1.5rem;
	}
	a:hover {
		color: var(--accent);
	}
	a:focus-visible {
		outline: 2px solid var(--accent);
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
		.workflow ol {
			grid-template-columns: 1fr;
		}
		.screen-heading {
			align-items: flex-start;
			flex-direction: column;
		}
		.story-sections section {
			gap: 0.9rem;
		}
		.evidence > header,
		.evidence-list a {
			gap: 0.75rem;
		}
		footer {
			align-items: flex-start;
			flex-direction: column;
		}
		.more-work {
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
