<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowUpRightIcon as ArrowUpRight,
		EnvelopeSimpleIcon as EnvelopeSimple,
		GithubLogoIcon as GithubLogo,
		LinkedinLogoIcon as LinkedinLogo
	} from 'phosphor-svelte';
	import {
		aboutSeo,
		jsonLdScriptTag,
		PUBLIC_AVAILABILITY_LINE,
		PUBLIC_CONTACT_EMAIL,
		PUBLIC_CONTACT_MAILTO,
		PUBLIC_GITHUB_URL,
		PUBLIC_LINKEDIN_URL,
		PUBLIC_RESUME_LINE,
		PUBLIC_X_URL
	} from '$lib/domain/public-seo';
	import { getClientTelemetry } from '$lib/telemetry/client-telemetry';

	const clientTelemetry = getClientTelemetry();
	const tools = ['TypeScript', 'Svelte 5', 'SvelteKit', 'Cloudflare Workers', 'Effect', 'GitHub'];
</script>

<svelte:head>
	<title>{aboutSeo.title}</title>
	<meta name="description" content={aboutSeo.description} />
	<link rel="canonical" href={aboutSeo.canonical} />
	<link rel="me" href={PUBLIC_GITHUB_URL} />
	<link rel="me" href={PUBLIC_LINKEDIN_URL} />
	<meta property="og:type" content="profile" />
	<meta property="og:site_name" content="latham.cloud" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={aboutSeo.title} />
	<meta property="og:description" content={aboutSeo.description} />
	<meta property="og:url" content={aboutSeo.canonical} />
	<meta property="og:image" content="https://latham.cloud/og-image.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={aboutSeo.title} />
	<meta name="twitter:description" content={aboutSeo.description} />
	<meta name="twitter:image" content="https://latham.cloud/og-image.svg" />
	<!-- JSON-LD is serialized from local constants, not untrusted input. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(aboutSeo.jsonLd)}
</svelte:head>

<main class="about-page">
	<nav class="topline" aria-label="Page navigation">
		<a class="back-link" href={resolve('/')}><span aria-hidden="true">←</span> Weeknote</a>
		<span class="page-index">Profile / 01</span>
	</nav>

	<header class="hero">
		<div class="hero-copy">
			<p class="eyebrow">Olen Latham · Software developer</p>
			<h1>I build software you can inspect.</h1>
			<p class="lead">
				TypeScript and Svelte apps on Cloudflare, with delivery evidence in the open.
			</p>
		</div>

		<aside class="availability" aria-label="Availability and contact">
			<div class="availability__status">
				<span>Open to opportunities</span>
				<i aria-hidden="true"></i>
			</div>
			<p>{PUBLIC_AVAILABILITY_LINE}</p>
			<div class="contact-actions">
				<a
					class="contact-actions__primary"
					href={PUBLIC_CONTACT_MAILTO}
					rel="external"
					onclick={() => clientTelemetry?.recordContact('email_about')}
				>
					<EnvelopeSimple size={16} weight="fill" />
					Email Olen
				</a>
				<a
					href={PUBLIC_LINKEDIN_URL}
					target="_blank"
					rel="external noreferrer"
					onclick={() => clientTelemetry?.recordContact('linkedin_about')}
				>
					<LinkedinLogo size={16} weight="fill" />
					LinkedIn
				</a>
			</div>
			<div class="contact-meta">
				<a
					href={PUBLIC_CONTACT_MAILTO}
					rel="external"
					onclick={() => clientTelemetry?.recordContact('email_about')}>{PUBLIC_CONTACT_EMAIL}</a
				>
				<span>{PUBLIC_RESUME_LINE}</span>
			</div>
		</aside>
	</header>

	<div class="narrative-grid">
		<section class="build" aria-labelledby="what-i-build">
			<div class="section-heading">
				<span>01</span>
				<h2 id="what-i-build">What I build</h2>
			</div>
			<div class="section-copy">
				<p>
					Weeknote is a live SvelteKit application on Cloudflare Workers. It presents GitHub
					activity, delivery evidence, and confirmed project links without turning commit volume
					into a quality score.
				</p>
				<p>
					The same approach runs through my public work: typed domain logic, explicit failure
					states, and focused interfaces built around evidence people can verify.
				</p>
				<a class="evidence-link" href={resolve('/')}>
					Open the live dashboard <ArrowUpRight size={15} weight="bold" />
				</a>
			</div>
		</section>

		<section class="practice" aria-labelledby="how-i-work">
			<div class="section-heading">
				<span>02</span>
				<h2 id="how-i-work">How I work</h2>
			</div>
			<div class="practice-list">
				<article>
					<h3>Typed boundaries</h3>
					<p>Parse external data before it reaches domain logic or interface state.</p>
				</article>
				<article>
					<h3>Visible delivery</h3>
					<p>Connect changes to pull requests, checks, deployments, and exact records.</p>
				</article>
				<article>
					<h3>Small interfaces</h3>
					<p>Keep the important path direct, readable, and resilient when providers fail.</p>
				</article>
			</div>
		</section>
	</div>

	<footer class="foundation">
		<div>
			<span class="foundation__label">Current toolchain</span>
			<ul aria-label="Current development tools">
				{#each tools as tool (tool)}
					<li>{tool}</li>
				{/each}
			</ul>
		</div>
		<nav class="external-links" aria-label="External profiles">
			<a href={PUBLIC_GITHUB_URL} target="_blank" rel="external noreferrer">
				<GithubLogo size={16} weight="fill" /> GitHub
			</a>
			<a href={PUBLIC_X_URL} target="_blank" rel="external noreferrer">X</a>
		</nav>
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
	:global(body) {
		background-image:
			linear-gradient(rgb(231 232 225 / 2.5%) 1px, transparent 1px),
			linear-gradient(90deg, rgb(231 232 225 / 2.5%) 1px, transparent 1px);
		background-size: 4rem 4rem;
	}
	:global(*) {
		box-sizing: border-box;
	}
	.about-page {
		width: min(100% - 3rem, 86rem);
		min-height: 100dvh;
		margin: 0 auto;
		padding: 1.35rem 0 3rem;
	}
	.topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 3rem;
		border-bottom: 1px solid rgb(231 232 225 / 15%);
		font:
			600 0.68rem/1 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.back-link,
	.external-links a,
	.contact-meta a {
		color: inherit;
		text-decoration: none;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
	}
	.back-link span {
		color: #d8a54a;
	}
	.page-index {
		color: #777c78;
	}
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.55fr) minmax(17rem, 0.45fr);
		gap: clamp(3rem, 8vw, 8rem);
		align-items: end;
		padding: clamp(4rem, 9vw, 8rem) 0 clamp(4rem, 7vw, 6.5rem);
	}
	.hero-copy {
		min-width: 0;
	}
	.eyebrow,
	.section-heading > span,
	.foundation__label,
	.availability__status,
	.contact-meta {
		font-family: 'JetBrains Mono Variable', monospace;
	}
	.eyebrow {
		margin: 0 0 1.5rem;
		color: #d8a54a;
		font-size: 0.68rem;
		font-weight: 650;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	h1 {
		max-width: 12ch;
		margin: 0;
		font-size: clamp(4rem, 7.2vw, 7.4rem);
		font-weight: 680;
		line-height: 0.88;
		letter-spacing: -0.07em;
		text-wrap: balance;
	}
	.lead {
		max-width: 38ch;
		margin: 2rem 0 0;
		color: #aeb2ad;
		font-size: clamp(1.05rem, 1.7vw, 1.35rem);
		line-height: 1.5;
		text-wrap: pretty;
	}
	.availability {
		padding: 1.25rem;
		border-top: 1px solid #d8a54a;
		border-bottom: 1px solid rgb(231 232 225 / 18%);
		background: rgb(216 165 74 / 5%);
	}
	.availability__status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		color: #d8a54a;
		font-size: 0.65rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.availability__status i {
		width: 0.45rem;
		height: 0.45rem;
		background: #9fc89f;
		box-shadow: 0 0 0 3px rgb(159 200 159 / 12%);
	}
	.availability > p {
		margin: 1.25rem 0 1.5rem;
		font-size: 1rem;
		line-height: 1.45;
	}
	.contact-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
	}
	.contact-actions a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 2.65rem;
		border: 1px solid rgb(231 232 225 / 18%);
		color: #f0f0eb;
		font-size: 0.78rem;
		font-weight: 650;
		text-decoration: none;
		transition:
			background 180ms ease,
			border-color 180ms ease,
			transform 180ms ease;
	}
	.contact-actions__primary {
		border-color: #d8a54a !important;
		background: #d8a54a;
		color: #0b0d0e !important;
	}
	.contact-actions a:hover,
	.contact-actions a:focus-visible {
		border-color: #d8a54a;
		background: rgb(216 165 74 / 10%);
	}
	.contact-actions__primary:hover,
	.contact-actions__primary:focus-visible {
		background: #e2b762 !important;
	}
	.contact-actions a:active {
		transform: translateY(1px);
	}
	.contact-meta {
		display: grid;
		gap: 0.45rem;
		margin-top: 1rem;
		color: #777c78;
		font-size: 0.58rem;
		line-height: 1.4;
	}
	.contact-meta a {
		width: max-content;
		color: #aeb2ad;
	}
	.narrative-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(20rem, 0.75fr);
		border-top: 1px solid rgb(231 232 225 / 18%);
		border-bottom: 1px solid rgb(231 232 225 / 18%);
	}
	.narrative-grid section {
		padding: clamp(2.5rem, 5vw, 4.5rem);
	}
	.build {
		display: grid;
		grid-template-columns: minmax(9rem, 0.45fr) minmax(0, 1fr);
		gap: clamp(2rem, 5vw, 5rem);
		border-right: 1px solid rgb(231 232 225 / 18%);
	}
	.section-heading > span {
		display: block;
		margin-bottom: 1rem;
		color: #d8a54a;
		font-size: 0.62rem;
	}
	h2 {
		margin: 0;
		font-size: clamp(1.8rem, 3vw, 3rem);
		line-height: 0.95;
		letter-spacing: -0.05em;
	}
	.section-copy p,
	.practice-list p {
		color: #aeb2ad;
		line-height: 1.65;
		text-wrap: pretty;
	}
	.section-copy p {
		max-width: 45rem;
		margin: 0 0 1.25rem;
		font-size: 1rem;
	}
	.evidence-link {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 1rem;
		color: #d8a54a;
		font-size: 0.82rem;
		font-weight: 650;
		text-decoration: none;
	}
	.practice-list {
		margin-top: 2.5rem;
	}
	.practice-list article {
		display: grid;
		grid-template-columns: minmax(7.5rem, 0.6fr) 1fr;
		gap: 1rem;
		padding: 1.25rem 0;
		border-top: 1px solid rgb(231 232 225 / 13%);
	}
	.practice-list h3,
	.practice-list p {
		margin: 0;
		font-size: 0.82rem;
	}
	.practice-list h3 {
		font-weight: 650;
	}
	.foundation {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		padding: 2rem 0 0;
	}
	.foundation__label {
		display: block;
		margin-bottom: 0.9rem;
		color: #777c78;
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.foundation ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
		color: #aeb2ad;
		font-size: 0.78rem;
	}
	.external-links {
		display: flex;
		gap: 1.25rem;
		font-size: 0.75rem;
		font-weight: 650;
	}
	.external-links a {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	a:hover {
		color: #d8a54a;
	}
	a:focus-visible {
		outline: 2px solid #d8a54a;
		outline-offset: 4px;
	}
	@media (max-width: 820px) {
		.about-page {
			width: min(100% - 2rem, 44rem);
			padding-top: 0.75rem;
		}
		.hero {
			grid-template-columns: 1fr;
			gap: 2.75rem;
			padding: 3.5rem 0 3rem;
		}
		h1 {
			max-width: 10ch;
			font-size: clamp(3.35rem, 15vw, 5rem);
			line-height: 0.9;
		}
		.lead {
			margin-top: 1.5rem;
		}
		.narrative-grid {
			grid-template-columns: 1fr;
		}
		.narrative-grid section {
			padding: 2.5rem 0;
		}
		.build {
			grid-template-columns: 1fr;
			gap: 2rem;
			border-right: 0;
			border-bottom: 1px solid rgb(231 232 225 / 18%);
		}
		.practice-list {
			margin-top: 2rem;
		}
		.foundation {
			align-items: flex-start;
			padding: 1.5rem 0 0;
		}
	}
	@media (max-width: 480px) {
		.page-index {
			display: none;
		}
		.hero {
			gap: 2rem;
			padding-top: 2rem;
		}
		.eyebrow {
			margin-bottom: 1rem;
			font-size: 0.6rem;
		}
		h1 {
			font-size: clamp(2.75rem, 15vw, 3.7rem);
		}
		.availability {
			padding: 1rem;
		}
		.availability > p {
			margin: 0.9rem 0 1rem;
		}
		.practice-list article {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.foundation {
			align-items: flex-start;
			flex-direction: column;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.contact-actions a {
			transition: none;
		}
	}
</style>
