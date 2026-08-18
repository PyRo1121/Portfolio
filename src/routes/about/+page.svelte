<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		aboutSeo,
		jsonLdScriptTag,
		PUBLIC_GITHUB_URL,
		PUBLIC_LINKEDIN_URL,
		PUBLIC_X_URL
	} from '$lib/domain/public-seo';
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
	<nav aria-label="Page navigation"><a href={resolve('/')}>← Weeknote</a></nav>
	<header>
		<p class="eyebrow">About Olen Latham</p>
		<h1>Software developer working in TypeScript, Svelte, and Cloudflare.</h1>
		<p class="lead">
			I design and ship production web apps: TypeScript, Svelte 5, GitHub delivery, and Cloudflare
			Workers. Weeknote is my public engineering dashboard and portfolio.
		</p>
	</header>
	<section aria-labelledby="what-i-build">
		<h2 id="what-i-build">What I build</h2>
		<p>
			Weeknote is a live SvelteKit app on Cloudflare Workers. It shows GitHub activity, delivery
			evidence, and confirmed project links without treating commit volume as a quality score. The
			same stack shows up in the rest of my public work: typed domain logic, explicit failure modes,
			and small interfaces that stay fast.
		</p>
	</section>
	<section aria-labelledby="stack">
		<h2 id="stack">Stack</h2>
		<p>
			TypeScript, Svelte 5 and SvelteKit, Cloudflare Workers, GitHub, and Effect at server and
			domain boundaries. I care about evidence you can inspect: pull requests, checks, releases, and
			deployed Workers.
		</p>
	</section>
	<section aria-labelledby="work-together">
		<h2 id="work-together">Work together</h2>
		<p>
			If you are hiring for a software or full-stack role, maintaining an open-source project, or
			have useful feedback on the work here, I would be glad to hear from you.
		</p>
		<div class="links">
			<a href="mailto:olen@latham.cloud">Email me</a>
			<a href={PUBLIC_GITHUB_URL} target="_blank" rel="external noreferrer">GitHub</a>
			<a href={PUBLIC_LINKEDIN_URL} target="_blank" rel="external noreferrer">LinkedIn</a>
			<a href={PUBLIC_X_URL} target="_blank" rel="external noreferrer">X</a>
			<a href={resolve('/')}>Weeknote dashboard</a>
		</div>
	</section>
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
	.about-page {
		box-sizing: border-box;
		width: min(100% - 2rem, 54rem);
		min-height: 100dvh;
		margin: 0 auto;
		padding: clamp(2rem, 8vw, 7rem) 0 4rem;
	}
	nav a,
	.links a {
		color: #d8a54a;
		text-decoration: none;
	}
	nav a:hover,
	.links a:hover {
		text-decoration: underline;
	}
	header {
		max-width: 48rem;
		padding: clamp(4rem, 12vw, 9rem) 0 clamp(3rem, 8vw, 6rem);
		border-bottom: 1px solid rgb(231 232 225 / 18%);
	}
	.eyebrow {
		color: #d8a54a;
		font: 600 0.72rem/1.2 monospace;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	h1 {
		max-width: 16ch;
		margin: 1rem 0;
		font-size: clamp(3rem, 9vw, 6.5rem);
		line-height: 0.92;
		letter-spacing: -0.07em;
	}
	.lead,
	section p {
		max-width: 42rem;
		color: #aeb2ad;
		font-size: clamp(1.1rem, 2vw, 1.45rem);
		line-height: 1.55;
	}
	section {
		max-width: 42rem;
		padding: 3rem 0;
		border-bottom: 1px solid rgb(231 232 225 / 18%);
	}
	h2 {
		margin: 0 0 1rem;
		font-size: clamp(1.6rem, 3vw, 2.4rem);
		letter-spacing: -0.04em;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.5rem;
		margin-top: 1.5rem;
		font-weight: 650;
	}
</style>
