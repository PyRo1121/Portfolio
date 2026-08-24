<script lang="ts">
	import { asset, resolve } from '$app/paths';
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
		PUBLIC_SOCIAL_IMAGE_URL
	} from '$lib/domain/public-seo';
	import { getClientTelemetry } from '$lib/telemetry/client-telemetry';

	const clientTelemetry = getClientTelemetry();
	const profilePhotoUrl = asset('/portrait.webp');
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
	<meta property="og:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Olen Latham — software, systems, and cloud work" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={aboutSeo.title} />
	<meta name="twitter:description" content={aboutSeo.description} />
	<meta name="twitter:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta name="twitter:image:alt" content="Olen Latham — software, systems, and cloud work" />
	<!-- JSON-LD is serialized from local constants, not untrusted input. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(aboutSeo.jsonLd)}
</svelte:head>

<a class="skip-link" href="#about-content">Skip to about</a>

<main id="about-content" class="about-page" tabindex="-1">
	<nav class="topline" aria-label="Page navigation">
		<a href={resolve('/')}><span aria-hidden="true">←</span> Portfolio</a>
		<span>About Olen</span>
	</nav>

	<header class="intro">
		<div class="intro-copy">
			<p class="hello">Hi, I’m Olen.</p>
			<h1>I like fixing problems that waste people’s time.</h1>
			<div class="introduction">
				<p>
					I work in customer service at Bank of America, where the job starts with listening:
					understand what went wrong, make a confusing situation clearer, and help someone reach the
					next step.
				</p>
			</div>
			<div id="contact" class="contact-row">
				<a
					class="primary-contact"
					href={PUBLIC_CONTACT_MAILTO}
					rel="external"
					onclick={() => clientTelemetry?.recordContact('email_about')}
				>
					<EnvelopeSimple size={17} weight="fill" /> Email Olen
				</a>
				<a
					href={PUBLIC_LINKEDIN_URL}
					target="_blank"
					rel="external noreferrer"
					onclick={() => clientTelemetry?.recordContact('linkedin_about')}
				>
					<LinkedinLogo size={17} weight="fill" /> LinkedIn
				</a>
			</div>
			<p class="contact-note">{PUBLIC_CONTACT_EMAIL} · {PUBLIC_RESUME_LINE}</p>
			<p class="next-step">
				Outside work, I build developer tools and cloud applications. I’m working toward a role
				where I can bring the same patience and troubleshooting instinct to software, systems, and
				infrastructure.
			</p>
		</div>

		<figure>
			<img src={profilePhotoUrl} alt="Olen Latham" width="640" height="640" />
			<figcaption>Developer tools, cloud systems, and the work behind them.</figcaption>
		</figure>
	</header>

	<section class="projects" aria-labelledby="projects-heading">
		<header>
			<h2 id="projects-heading">What I’m building, and why.</h2>
		</header>

		<div class="project-grid">
			<article>
				<h3>Too many package managers</h3>
				<p>
					OMG started with a problem I kept running into: system packages and language runtimes all
					came with different commands, configuration, and update paths. I wanted one tool I could
					reach for instead of remembering seven.
				</p>
				<p>
					Building it in Rust has pushed me into package resolution, platform differences,
					performance work, release automation, and the less glamorous job of documenting what
					actually works.
				</p>
				<a href={resolve('/work/omg')}>
					Read the OMG case study <ArrowUpRight size={15} weight="bold" />
				</a>
			</article>

			<article>
				<h3>A contribution graph with context</h3>
				<p>
					GitHub can show that I was busy. It does not explain what shipped, what failed, or where
					the evidence stops. I built Weeknote because I wanted a more honest record of the work.
				</p>
				<p>
					It now connects GitHub activity, checks, deployments, Cloudflare infrastructure, and
					visitor data while keeping private work and owner-only records behind clear boundaries.
				</p>
				<a href={resolve('/work/weeknote')}>
					Read the Weeknote case study <ArrowUpRight size={15} weight="bold" />
				</a>
			</article>
		</div>
	</section>

	<section class="career-shift" aria-labelledby="career-heading">
		<div>
			<h2 id="career-heading">What I can bring to a team</h2>
		</div>
		<div class="career-copy">
			<p>
				I know that side projects are not the same as years in an engineering role, and I’m not
				trying to pretend otherwise. What I do bring is experience talking with people when the
				problem is unclear, staying with difficult issues, documenting what happened, and learning
				unfamiliar systems until I can make progress.
			</p>
			<p>
				{PUBLIC_AVAILABILITY_LINE} I’m especially interested in teams where reliability, clear communication,
				and steady follow-through matter as much as knowing the right tool on day one.
			</p>
		</div>
	</section>

	<footer>
		<p>If you want to see how I work, start with the code and the live dashboard.</p>
		<nav aria-label="Work links">
			<a href={PUBLIC_GITHUB_URL} target="_blank" rel="external noreferrer">
				<GithubLogo size={16} weight="fill" /> GitHub
			</a>
			<a href={resolve('/evidence')}>Live evidence <ArrowUpRight size={14} weight="bold" /></a>
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
	:global(*) {
		box-sizing: border-box;
	}
	.about-page {
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
		color: #808580;
		font:
			600 0.65rem/1 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.topline a,
	.project-grid a,
	footer a {
		color: inherit;
		text-decoration: none;
	}
	.topline a {
		display: inline-flex;
		gap: 0.55rem;
		color: #f0f0eb;
	}
	.topline a span {
		color: #d8a54a;
	}
	.intro {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.65fr);
		gap: clamp(3rem, 8vw, 7rem);
		align-items: center;
		padding: clamp(4rem, 9vw, 7.5rem) 0;
	}
	.hello {
		margin: 0 0 1rem;
		color: #d8a54a;
		font:
			650 0.7rem/1.2 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h1 {
		max-width: 11ch;
		margin: 0;
		font-size: clamp(3.6rem, 6.5vw, 6.25rem);
		font-weight: 680;
		line-height: 0.92;
		letter-spacing: -0.065em;
		text-wrap: balance;
	}
	.introduction {
		max-width: 41rem;
		margin-top: 2.25rem;
	}
	.introduction p,
	.next-step,
	.project-grid p,
	.career-copy p {
		color: #b2b6b1;
		line-height: 1.65;
		text-wrap: pretty;
	}
	.introduction p,
	.next-step {
		font-size: 1.04rem;
	}
	.introduction p {
		margin: 0;
	}
	.next-step {
		max-width: 41rem;
		margin: 1.5rem 0 0;
	}
	.contact-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1.75rem;
	}
	.contact-row a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 2.75rem;
		padding: 0 1rem;
		border: 1px solid rgb(231 232 225 / 20%);
		color: #f0f0eb;
		font-size: 0.8rem;
		font-weight: 650;
		text-decoration: none;
		transition:
			background 180ms ease,
			border-color 180ms ease,
			transform 180ms ease;
	}
	.contact-row .primary-contact {
		border-color: #d8a54a;
		background: #d8a54a;
		color: #0b0d0e;
	}
	.contact-row a:hover,
	.contact-row a:focus-visible {
		border-color: #d8a54a;
		background: rgb(216 165 74 / 9%);
	}
	.contact-row .primary-contact:hover,
	.contact-row .primary-contact:focus-visible {
		background: #e2b762;
	}
	.contact-row a:active {
		transform: translateY(1px);
	}
	.contact-note {
		margin: 0.8rem 0 0;
		color: #777c78;
		font:
			500 0.6rem/1.5 'JetBrains Mono Variable',
			monospace;
	}
	figure {
		width: min(100%, 20rem);
		margin: 0;
		justify-self: end;
	}
	figure img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		border-top: 2px solid #d8a54a;
		filter: saturate(0.82) contrast(1.04);
		object-fit: cover;
	}
	figcaption {
		max-width: 25rem;
		padding-top: 0.8rem;
		color: #777c78;
		font:
			500 0.6rem/1.45 'JetBrains Mono Variable',
			monospace;
	}
	.projects {
		padding: clamp(3.5rem, 7vw, 6rem) 0;
		border-top: 1px solid rgb(231 232 225 / 16%);
		border-bottom: 1px solid rgb(231 232 225 / 16%);
	}
	h2 {
		max-width: 14ch;
		margin: 0;
		font-size: clamp(2.2rem, 4vw, 4rem);
		line-height: 0.98;
		letter-spacing: -0.05em;
		text-wrap: balance;
	}
	.project-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(2rem, 6vw, 6rem);
		margin-top: clamp(3rem, 6vw, 5rem);
	}
	.project-grid article {
		padding-top: 1.5rem;
		border-top: 1px solid rgb(231 232 225 / 18%);
	}
	.project-grid h3 {
		margin: 0 0 1.25rem;
		font-size: clamp(1.35rem, 2vw, 1.8rem);
		letter-spacing: -0.03em;
	}
	.project-grid p {
		margin: 0 0 1rem;
		font-size: 0.96rem;
	}
	.project-grid a,
	footer a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: #d8a54a;
		font-size: 0.8rem;
		font-weight: 650;
	}
	.project-grid a {
		margin-top: 1rem;
	}
	.career-shift {
		display: grid;
		grid-template-columns: minmax(14rem, 0.65fr) minmax(0, 1.35fr);
		gap: clamp(3rem, 9vw, 8rem);
		padding: clamp(4rem, 8vw, 7rem) 0;
	}
	.career-shift h2 {
		max-width: 10ch;
	}
	.career-copy {
		max-width: 43rem;
	}
	.career-copy p {
		margin: 0 0 1.25rem;
		font-size: clamp(1.05rem, 1.7vw, 1.25rem);
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: 2rem 0 0;
		border-top: 1px solid rgb(231 232 225 / 16%);
	}
	footer p {
		margin: 0;
		color: #777c78;
		font-size: 0.78rem;
	}
	footer nav {
		display: flex;
		gap: 1.25rem;
	}
	a:hover {
		color: #d8a54a;
	}
	a:focus-visible {
		outline: 2px solid #d8a54a;
		outline-offset: 4px;
	}
	@media (max-width: 760px) {
		.about-page {
			width: min(100% - 2rem, 40rem);
			padding-top: 0.75rem;
		}
		.intro {
			grid-template-columns: 1fr;
			gap: 3rem;
			padding: 3.25rem 0 3.75rem;
		}
		h1 {
			font-size: clamp(3rem, 14vw, 4.5rem);
		}
		.introduction {
			margin-top: 1.75rem;
		}
		figure {
			width: min(100%, 21rem);
		}
		.career-shift {
			grid-template-columns: 1fr;
		}
		.project-grid {
			grid-template-columns: 1fr;
			gap: 2.75rem;
		}
		.career-shift {
			gap: 2.25rem;
		}
		footer {
			align-items: flex-start;
			flex-direction: column;
		}
	}
	@media (max-width: 400px) {
		.topline > span {
			display: none;
		}
		.intro {
			padding-top: 2.5rem;
		}
		h1 {
			font-size: clamp(2.75rem, 14vw, 3.4rem);
		}
		.introduction p {
			font-size: 0.98rem;
		}
		.contact-row {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.contact-row a {
			padding: 0 0.55rem;
		}
		.contact-note {
			max-width: 30ch;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.contact-row a {
			transition: none;
		}
	}
</style>
