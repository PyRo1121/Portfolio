<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import {
		ArrowUpRightIcon as ArrowUpRight,
		EnvelopeSimpleIcon as EnvelopeSimple,
		GithubLogoIcon as GithubLogo,
		LinkedinLogoIcon as LinkedinLogo
	} from 'phosphor-svelte';
	import { publicCaseStudyFor } from '$lib/domain/public-case-study';
	import { createPublicPortfolioEvidence } from '$lib/domain/public-portfolio-view';
	import {
		homeSeo,
		jsonLdScriptTag,
		PUBLIC_AVAILABILITY_LINE,
		PUBLIC_CONTACT_EMAIL,
		PUBLIC_CONTACT_MAILTO,
		PUBLIC_GITHUB_URL,
		PUBLIC_LINKEDIN_URL,
		PUBLIC_RESUME_LINE,
		PUBLIC_SOCIAL_IMAGE_URL
	} from '$lib/domain/public-seo';
	import { getClientTelemetry } from '$lib/telemetry/client-telemetry';

	let { data }: PageProps = $props();
	const evidence = $derived(createPublicPortfolioEvidence(data.snapshot));
	const omg = publicCaseStudyFor('omg');
	const weeknote = publicCaseStudyFor('weeknote');
	const clientTelemetry = getClientTelemetry();
	const profilePhotoUrl = asset('/portrait.webp');
	const omgImage = asset('/portfolio/omg-repository.webp');
	const weeknoteImage = asset('/portfolio/weeknote-dashboard.webp');
</script>

<svelte:head>
	<title>{homeSeo.title}</title>
	<meta name="description" content={homeSeo.description} />
	<link rel="canonical" href={homeSeo.canonical} />
	<link rel="me" href={PUBLIC_GITHUB_URL} />
	<link rel="me" href={PUBLIC_LINKEDIN_URL} />
	<meta property="og:type" content="profile" />
	<meta property="og:site_name" content="latham.cloud" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={homeSeo.title} />
	<meta property="og:description" content={homeSeo.description} />
	<meta property="og:url" content={homeSeo.canonical} />
	<meta property="og:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="Olen Latham - developer tools, cloud systems, and technical support"
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={homeSeo.title} />
	<meta name="twitter:description" content={homeSeo.description} />
	<meta name="twitter:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta
		name="twitter:image:alt"
		content="Olen Latham - developer tools, cloud systems, and technical support"
	/>
	<!-- JSON-LD is serialized from local constants, not untrusted input. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(homeSeo.jsonLd)}
</svelte:head>

<a class="skip-link" href="#portfolio-content">Skip to portfolio</a>

<div class="portfolio-page">
	<header class="site-header">
		<a class="wordmark" href={resolve('/')} aria-current="page">
			<strong>Olen Latham</strong>
			<span>Developer tools / cloud systems</span>
		</a>
		<nav aria-label="Portfolio navigation">
			<a href="#work">Work</a>
			<a
				href={resolve('/evidence')}
				onclick={() => clientTelemetry?.recordPortfolioAction('live_evidence_open')}>Evidence</a
			>
			<a href={resolve('/about')}>About</a>
			<a
				class="contact-link"
				href={PUBLIC_CONTACT_MAILTO}
				rel="external"
				onclick={() => clientTelemetry?.recordContact('email_header')}>Contact</a
			>
		</nav>
	</header>

	<main id="portfolio-content" tabindex="-1">
		<section class="hero" aria-labelledby="portfolio-heading">
			<div class="hero-copy">
				<p class="hello">Support-minded software and systems</p>
				<h1 id="portfolio-heading">I turn technical friction into a clear next step.</h1>
				<p class="hero-summary">
					Rust tools, Svelte applications, Cloudflare infrastructure, and the debugging work between
					them—built to be understandable, testable, and useful in production.
				</p>
				<div class="hero-actions">
					<a class="primary-action" href="#work">See what I’ve built</a>
					<a
						href={PUBLIC_CONTACT_MAILTO}
						rel="external"
						onclick={() => clientTelemetry?.recordContact('email_summary')}
						><EnvelopeSimple size={17} weight="fill" /> Start a conversation</a
					>
				</div>
			</div>

			<figure class="portrait">
				<div class="portrait-frame">
					<img src={profilePhotoUrl} alt="Olen Latham" width="640" height="640" />
				</div>
				<figcaption>
					<p>{PUBLIC_AVAILABILITY_LINE}</p>
				</figcaption>
			</figure>
		</section>

		<section class="evidence-strip" aria-labelledby="live-evidence-heading">
			<div>
				<span>Live evidence</span>
				<h2 id="live-evidence-heading">Recent work, backed by the record.</h2>
			</div>
			{#if evidence._tag === 'Current'}
				<div class="evidence-facts">
					<div>
						<strong>{evidence.commits}</strong><span
							>authored commits<br />{evidence.periodLabel}</span
						>
					</div>
					<div>
						<strong>{evidence.activeRepositories}</strong><span
							>active repositories<br />public and allowlisted</span
						>
					</div>
					<div>
						<strong>{evidence.provenance}</strong><span
							>complete snapshot<br /><time datetime={evidence.generatedAt}
								>{evidence.generatedAtLabel}</time
							></span
						>
					</div>
				</div>
			{:else}
				<p class="evidence-unavailable">{evidence.reason}</p>
			{/if}
			<a
				href={resolve('/evidence')}
				onclick={() => clientTelemetry?.recordPortfolioAction('live_evidence_open')}
				>Explore the evidence <ArrowUpRight size={15} weight="bold" /></a
			>
		</section>

		<section id="work" class="selected-work" aria-labelledby="work-heading">
			<header>
				<h2 id="work-heading">Two products. One operating principle: remove the friction.</h2>
				<p>
					OMG simplifies fragmented tooling. Weeknote makes engineering activity auditable. Each
					case study shows the problem, the decisions, and the evidence.
				</p>
			</header>

			<article class="project project-omg">
				<a
					class="project-image"
					href={resolve('/work/omg')}
					onclick={() => clientTelemetry?.recordPortfolioAction('featured_omg_open')}
					aria-label="Read the OMG case study"
				>
					<img
						src={omgImage}
						alt="The public OMG repository showing its Rust source, documentation, tests, and current release"
						width="1440"
						height="900"
						loading="lazy"
					/>
				</a>
				<div class="project-copy">
					<p class="project-kind">OMG / Rust CLI</p>
					<h3>{omg.title}</h3>
					<p>
						A Rust CLI that gives package managers and language runtimes one predictable command
						surface—without hiding platform-specific behavior.
					</p>
					<a
						href={resolve('/work/omg')}
						onclick={() => clientTelemetry?.recordPortfolioAction('featured_omg_open')}
						>Read the OMG case study <ArrowUpRight size={15} weight="bold" /></a
					>
				</div>
			</article>

			<article class="project project-weeknote">
				<a
					class="project-image"
					href={resolve('/work/weeknote')}
					onclick={() => clientTelemetry?.recordPortfolioAction('featured_weeknote_open')}
					aria-label="Read the Weeknote case study"
				>
					<img
						src={weeknoteImage}
						alt="The live Weeknote dashboard showing current GitHub activity, repository evidence, and contact paths"
						width="1440"
						height="900"
						loading="lazy"
					/>
				</a>
				<div class="project-copy">
					<p class="project-kind">Weeknote / Svelte 5 and Cloudflare</p>
					<h3>{weeknote.title}</h3>
					<p>
						A production SvelteKit and Cloudflare application that turns GitHub activity into a
						bounded evidence record: work, checks, deployments, and explicit unknowns.
					</p>
					<a
						href={resolve('/work/weeknote')}
						onclick={() => clientTelemetry?.recordPortfolioAction('featured_weeknote_open')}
						>Read the Weeknote case study <ArrowUpRight size={15} weight="bold" /></a
					>
				</div>
			</article>
		</section>

		<section class="capabilities" aria-labelledby="capabilities-heading">
			<header>
				<p class="section-label">Where I’m useful</p>
				<h2 id="capabilities-heading">From “something’s wrong” to a fix people can trust.</h2>
				<p>I’m strongest where communication, troubleshooting, and implementation meet.</p>
				<a href={resolve('/about')}>Read how I got here <ArrowUpRight size={15} weight="bold" /></a>
			</header>
			<div class="capability-list">
				<article>
					<div>
						<h3>Troubleshooting under ambiguity</h3>
						<p>
							Turn vague symptoms into a reproducible issue, explain what is known, and keep the
							next step clear.
						</p>
					</div>
				</article>
				<article>
					<div>
						<h3>Tools and automation</h3>
						<p>
							Build typed CLIs, interfaces, and integrations that replace repetitive work with a
							dependable path.
						</p>
					</div>
				</article>
				<article>
					<div>
						<h3>Cloud delivery</h3>
						<p>
							Trace credentials, APIs, caches, deployments, and failure boundaries instead of
							treating production as a black box.
						</p>
					</div>
				</article>
			</div>
		</section>

		<section id="contact" class="closing" aria-labelledby="contact-heading">
			<div>
				<h2 id="contact-heading">Need someone who can stay with the problem?</h2>
				<p>{PUBLIC_AVAILABILITY_LINE}</p>
			</div>
			<div class="closing-actions">
				<a
					class="primary-action"
					href={PUBLIC_CONTACT_MAILTO}
					rel="external"
					onclick={() => clientTelemetry?.recordContact('email_summary')}
					><EnvelopeSimple size={17} weight="fill" /> Email Olen</a
				>
				<a
					href={PUBLIC_LINKEDIN_URL}
					target="_blank"
					rel="external noreferrer"
					onclick={() => clientTelemetry?.recordContact('linkedin_summary')}
					><LinkedinLogo size={17} weight="fill" /> LinkedIn</a
				>
				<p>{PUBLIC_CONTACT_EMAIL}<br />{PUBLIC_RESUME_LINE}</p>
			</div>
		</section>
	</main>

	<footer class="site-footer">
		<span>Olen Latham / software, systems, and cloud work</span>
		<nav aria-label="Footer links">
			<a href={PUBLIC_GITHUB_URL} target="_blank" rel="external noreferrer"
				><GithubLogo size={15} weight="fill" /> GitHub</a
			>
			<a
				href={resolve('/evidence')}
				onclick={() => clientTelemetry?.recordPortfolioAction('live_evidence_open')}
				>Live evidence</a
			>
			<a href={resolve('/about')}>About</a>
		</nav>
	</footer>
</div>

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
	.portfolio-page {
		width: min(100% - 3rem, 76rem);
		margin: 0 auto;
	}
	.site-header {
		display: flex;
		min-height: 4.5rem;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		border-bottom: 1px solid var(--line);
	}
	.wordmark {
		display: grid;
		gap: 0.18rem;
		color: inherit;
		text-decoration: none;
	}
	.wordmark strong {
		font-size: 0.82rem;
		font-weight: 720;
		letter-spacing: -0.02em;
	}
	.wordmark span {
		color: var(--faint);
		font:
			500 0.52rem/1 'JetBrains Mono Variable',
			monospace;
	}
	.site-header nav,
	.site-footer nav {
		display: flex;
		align-items: center;
		gap: 1.1rem;
	}
	.site-header nav a,
	.site-footer nav a {
		color: var(--muted);
		font:
			600 0.62rem/1 'JetBrains Mono Variable',
			monospace;
		text-decoration: none;
	}
	.site-header nav a:hover,
	.site-footer nav a:hover {
		color: #f0f0eb;
	}
	.site-header nav .contact-link {
		padding: 0.68rem 0.8rem;
		border: 1px solid var(--accent);
		color: var(--accent);
	}
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.65fr);
		align-items: center;
		gap: clamp(3rem, 8vw, 7rem);
		padding: clamp(4rem, 8vw, 6.5rem) 0 clamp(4.5rem, 8vw, 7rem);
	}
	.hello,
	.project-kind,
	.section-label,
	.evidence-strip > div:first-child > span {
		margin: 0;
		color: var(--accent);
		font:
			650 0.66rem/1.2 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h1 {
		max-width: 11ch;
		margin: 1rem 0 0;
		font-size: clamp(3.7rem, 6.2vw, 6rem);
		font-weight: 680;
		line-height: 0.92;
		letter-spacing: -0.065em;
		text-wrap: balance;
	}
	.hero-summary {
		max-width: 39rem;
		margin: 1.7rem 0 0;
		color: var(--muted);
		font-size: 1.04rem;
		line-height: 1.6;
		text-wrap: pretty;
	}
	.hero-actions,
	.closing-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin-top: 1.75rem;
	}
	.hero-actions a,
	.closing-actions a {
		display: inline-flex;
		min-height: 2.85rem;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0 1rem;
		border: 1px solid var(--strong);
		color: #f0f0eb;
		font-size: 0.8rem;
		font-weight: 650;
		text-decoration: none;
		transition:
			background 180ms ease,
			border-color 180ms ease,
			transform 180ms ease;
	}
	.hero-actions .primary-action,
	.closing-actions .primary-action {
		border-color: var(--accent);
		background: var(--accent);
		color: #0b0d0e;
	}
	.hero-actions a:hover,
	.closing-actions a:hover {
		border-color: var(--accent);
		background: rgb(216 165 74 / 9%);
	}
	.hero-actions .primary-action:hover,
	.closing-actions .primary-action:hover {
		background: #e2b762;
	}
	.hero-actions a:active,
	.closing-actions a:active {
		transform: translateY(1px);
	}
	.portrait {
		width: min(100%, 21rem);
		margin: 0;
		justify-self: end;
	}
	.portrait-frame {
		position: relative;
		border-top: 2px solid var(--accent);
	}
	.portrait-frame::after {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgb(11 13 14 / 28%), transparent 50%);
		content: '';
		pointer-events: none;
	}
	.portrait img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		filter: saturate(0.82) contrast(1.04);
		object-fit: cover;
	}
	.portrait figcaption {
		padding: 0.85rem 0 0;
	}
	.portrait figcaption p {
		margin: 0.55rem 0 0;
		color: var(--muted);
		font-size: 0.72rem;
		line-height: 1.5;
	}
	.evidence-strip {
		display: grid;
		grid-template-columns: minmax(10rem, 0.7fr) minmax(24rem, 1.55fr) auto;
		align-items: center;
		gap: 2rem;
		padding: 1.35rem 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	.evidence-strip h2 {
		margin: 0.4rem 0 0;
		font-size: 1.15rem;
		letter-spacing: -0.03em;
	}
	.evidence-facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
	}
	.evidence-facts > div {
		display: grid;
		gap: 0.35rem;
		padding: 0.2rem 1rem;
		border-left: 1px solid var(--line);
	}
	.evidence-facts strong {
		color: var(--positive);
		font-size: 1rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
	}
	.evidence-facts span,
	.evidence-unavailable {
		color: var(--faint);
		font:
			500 0.5rem/1.5 'JetBrains Mono Variable',
			monospace;
	}
	.evidence-strip > a,
	.project-copy > a,
	.capabilities a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
		font-size: 0.78rem;
		font-weight: 650;
		text-decoration: none;
		white-space: nowrap;
	}
	.selected-work {
		padding: clamp(5rem, 9vw, 8rem) 0;
	}
	.selected-work > header {
		max-width: 46rem;
	}
	.selected-work h2,
	.capabilities h2,
	.closing h2 {
		margin: 0;
		font-size: clamp(2.45rem, 4.7vw, 4.5rem);
		font-weight: 670;
		line-height: 0.96;
		letter-spacing: -0.055em;
		text-wrap: balance;
	}
	.selected-work > header p {
		max-width: 42rem;
		margin: 1.25rem 0 0;
		color: var(--muted);
		font-size: 0.94rem;
		line-height: 1.6;
	}
	.project {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(17rem, 0.8fr);
		align-items: center;
		gap: clamp(2.5rem, 6vw, 6rem);
		padding: clamp(3.8rem, 7vw, 6rem) 0;
		border-bottom: 1px solid var(--line);
	}
	.project-weeknote .project-image {
		grid-column: 2;
		grid-row: 1;
	}
	.project-weeknote .project-copy {
		grid-column: 1;
		grid-row: 1;
	}
	.project-image {
		display: block;
		overflow: hidden;
		border-top: 2px solid var(--accent);
		background: var(--surface);
	}
	.project-image img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 10;
		filter: saturate(0.76) contrast(1.04);
		object-fit: cover;
		object-position: top;
		transition:
			filter 220ms ease,
			transform 220ms ease;
	}
	.project-image:hover img,
	.project-image:focus-visible img {
		filter: saturate(0.95) contrast(1.04);
		transform: scale(1.012);
	}
	.project-copy h3 {
		max-width: 12ch;
		margin: 0.8rem 0 0;
		font-size: clamp(2rem, 3.6vw, 3.35rem);
		line-height: 0.98;
		letter-spacing: -0.05em;
		text-wrap: balance;
	}
	.project-copy > p:not(.project-kind) {
		margin: 1.25rem 0 0;
		color: var(--muted);
		font-size: 0.93rem;
		line-height: 1.6;
		text-wrap: pretty;
	}
	.project-copy > a {
		margin-top: 1.5rem;
	}
	.capabilities {
		display: grid;
		grid-template-columns: minmax(18rem, 0.82fr) minmax(0, 1.18fr);
		gap: clamp(3rem, 8vw, 7rem);
		padding: clamp(4rem, 8vw, 7rem) 0;
		border-top: 1px solid var(--line);
	}
	.capabilities > header {
		align-self: start;
	}
	.capabilities h2 {
		max-width: 12ch;
		margin-top: 0.8rem;
		font-size: clamp(2.2rem, 4vw, 3.8rem);
	}
	.capabilities > header > p:not(.section-label) {
		max-width: 31rem;
		margin: 1.3rem 0 0;
		color: var(--muted);
		font-size: 0.94rem;
		line-height: 1.6;
	}
	.capabilities > header > a {
		margin-top: 1.35rem;
	}
	.capability-list {
		border-top: 1px solid var(--line);
	}
	.capability-list article {
		display: grid;
		gap: 0;
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--line);
	}
	.capability-list h3 {
		margin: 0;
		font-size: 1.05rem;
		letter-spacing: -0.025em;
	}
	.capability-list p {
		margin: 0.55rem 0 0;
		color: var(--muted);
		font-size: 0.82rem;
		line-height: 1.55;
		text-wrap: pretty;
	}
	.closing {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
		align-items: center;
		gap: 3rem;
		padding: clamp(3.5rem, 7vw, 6rem) 0;
		border-top: 1px solid var(--accent);
	}
	.closing h2 {
		max-width: 11ch;
	}
	.closing > div:first-child p {
		max-width: 42rem;
		margin: 1rem 0 0;
		color: var(--muted);
		line-height: 1.6;
	}
	.closing-actions {
		margin-top: 0;
	}
	.closing-actions p {
		width: 100%;
		margin: 0.35rem 0 0;
		color: var(--faint);
		font:
			500 0.58rem/1.55 'JetBrains Mono Variable',
			monospace;
	}
	.site-footer {
		display: flex;
		min-height: 4.5rem;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		border-top: 1px solid var(--line);
		color: var(--faint);
		font:
			500 0.56rem/1 'JetBrains Mono Variable',
			monospace;
	}
	.site-footer nav a {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	a:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 4px;
	}
	@media (max-width: 900px) {
		.evidence-strip {
			grid-template-columns: 1fr auto;
		}
		.evidence-facts,
		.evidence-unavailable {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		.evidence-strip > a {
			grid-column: 2;
			grid-row: 1;
		}
	}
	@media (max-width: 760px) {
		.portfolio-page {
			width: min(100% - 2rem, 40rem);
		}
		.site-header {
			min-height: 4rem;
		}
		.site-header nav a:not(.contact-link) {
			display: none;
		}
		.hero {
			grid-template-columns: 1fr;
			gap: 3rem;
			padding: 3.2rem 0 4rem;
		}
		h1 {
			font-size: clamp(3.2rem, 14vw, 4.7rem);
		}
		.portrait {
			width: min(100%, 20rem);
			justify-self: start;
		}
		.evidence-strip,
		.project,
		.capabilities,
		.closing {
			grid-template-columns: 1fr;
		}
		.evidence-strip {
			gap: 1.25rem;
			padding: 1.5rem 0;
		}
		.evidence-facts,
		.evidence-unavailable,
		.evidence-strip > a {
			grid-column: 1;
			grid-row: auto;
		}
		.evidence-facts > div:first-child {
			padding-left: 0;
			border-left: 0;
		}
		.selected-work {
			padding: 4.5rem 0;
		}
		.project {
			gap: 2.25rem;
			padding: 3.5rem 0;
		}
		.project-weeknote .project-image,
		.project-weeknote .project-copy {
			grid-column: 1;
			grid-row: auto;
		}
		.project-weeknote .project-image {
			grid-row: 1;
		}
		.capabilities,
		.closing {
			gap: 2.25rem;
		}
		.closing-actions {
			justify-content: flex-start;
		}
		.site-footer {
			align-items: flex-start;
			flex-direction: column;
			padding: 1.5rem 0;
		}
	}
	@media (max-width: 430px) {
		.wordmark span {
			display: none;
		}
		.hero-summary {
			font-size: 0.98rem;
		}
		.hero-actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.hero-actions a {
			padding: 0 0.6rem;
		}
		.evidence-facts {
			grid-template-columns: 1fr 1fr;
		}
		.evidence-facts > div:last-child {
			grid-column: 1 / -1;
			padding-top: 0.9rem;
			padding-left: 0;
			border-top: 1px solid var(--line);
			border-left: 0;
		}
		.closing-actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.site-footer nav {
			flex-wrap: wrap;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-actions a,
		.closing-actions a,
		.project-image img {
			transition: none;
		}
	}
</style>
