<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>About Olen Latham — Software developer building toward full-stack work</title>
	<meta
		name="description"
		content="Olen Latham is transitioning from finance into software development and full-stack engineering through sustained open-source and product work."
	/>
	<link rel="canonical" href="https://latham.cloud/about" />
	<meta property="og:type" content="profile" />
	<meta property="og:title" content="About Olen Latham — Software developer" />
	<meta
		property="og:description"
		content="A finance-to-software transition grounded in open-source development, product interfaces, and Cloudflare Workers."
	/>
	<meta property="og:url" content="https://latham.cloud/about" />
	<meta property="og:image" content="https://latham.cloud/og-image.svg" />
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "ProfilePage",
			"@id": "https://latham.cloud/about#profile",
			"url": "https://latham.cloud/about",
			"name": "About Olen Latham",
			"mainEntity": {
				"@type": "Person",
				"@id": "https://latham.cloud/#olen-latham",
				"name": "Olen Latham",
				"url": "https://latham.cloud/",
				"jobTitle": "Software developer",
				"sameAs": ["https://github.com/PyRo1121", "https://x.com/PyRo1121"]
			}
		}
	</script>
</svelte:head>

<main class="about-page">
	<nav aria-label="Page navigation"><a href={resolve('/')}>← Weeknote</a></nav>
	<header>
		<p class="eyebrow">About Olen Latham</p>
		<h1>Building toward full-stack software work.</h1>
		<p class="lead">
			I’m transitioning from finance into software development by building consistently, studying
			real systems, and contributing work in public where it is useful.
		</p>
	</header>
	<section aria-labelledby="what-i-am-building">
		<h2 id="what-i-am-building">What I’m working on</h2>
		<p>
			My current practice spans product interfaces, TypeScript and Svelte, GitHub delivery, backend
			services, and Cloudflare Workers. Weeknote is a public engineering log that records activity
			and deployment evidence without treating commit volume as a quality score.
		</p>
	</section>
	<section aria-labelledby="work-together">
		<h2 id="work-together">Work together</h2>
		<p>
			If you work on an open-source project, have useful feedback, or are hiring for a role where I
			can grow into full-stack ownership, I’d be glad to hear from you.
		</p>
		<div class="links">
			<a href="mailto:olen@latham.cloud">Email me</a>
			<a href="https://github.com/PyRo1121" target="_blank" rel="external noreferrer">GitHub</a>
			<a href="https://x.com/PyRo1121" target="_blank" rel="external noreferrer">X</a>
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
		max-width: 11ch;
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
