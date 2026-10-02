<script lang="ts">
	import PublicShell from '$lib/components/PublicShell.svelte';
	import CinematicHero from '$lib/components/CinematicHero.svelte';
	import '$lib/styles/portfolio-home.css';
	import { asset, resolve } from '$app/paths';
	import {
		ArrowUpRightIcon as ArrowUpRight,
		EnvelopeSimpleIcon as EnvelopeSimple,
		GithubLogoIcon as GithubLogo,
		LinkedinLogoIcon as LinkedinLogo
	} from 'phosphor-svelte';
	import PublicSeoHead from '$lib/components/PublicSeoHead.svelte';
	import { DEPLOYLINT_PROJECT, OMG_PROJECT, TOKEN_CONTROL_URL } from '$lib/domain/showcase';
	import {
		homeSeo,
		PUBLIC_AVAILABILITY_LINE,
		PUBLIC_CONTACT_EMAIL,
		PUBLIC_CONTACT_MAILTO,
		PUBLIC_LINKEDIN_URL,
		PUBLIC_RESUME_LINE
	} from '$lib/domain/public-seo';
	import { loadClientTelemetry } from '$lib/telemetry/telemetry-gate';
	import type { ClientTelemetry } from '$lib/telemetry/client-telemetry';

	let clientTelemetry = $state<ClientTelemetry | null>(null);
	loadClientTelemetry().then((loaded) => (clientTelemetry = loaded));

	const omgImage = asset('/portfolio/omg-landing.webp');
	const deploylintImage = asset('/portfolio/deploylint-preview.png');
	const resumeUrl = asset('/olen-latham-resume.pdf');
</script>

<PublicSeoHead seo={homeSeo} />
<PublicShell>
	<a class="skip-link" href="#work">Skip to projects</a>
	<main id="portfolio-content" tabindex="-1">
		<CinematicHero telemetry={clientTelemetry} />
		<div class="portfolio-content">
			<section id="work" class="selected-work" aria-labelledby="work-heading">
				<header>
					<p class="section-label">Selected work</p>
					<h2 id="work-heading">Ideas that made it<br />into the world.</h2>
					<p>
						Two different products, each with a working site and a deeper account of the decisions
						behind it.
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
							alt="The OMG landing page: one command that installs apps and programming languages on Linux and macOS"
							width="1440"
							height="900"
							loading="lazy"
						/>
					</a>
					<div class="project-copy">
						<p class="project-kind">Rust CLI · Public alpha</p>
						<h3>OMG</h3>
						<h4>Rust package and runtime CLI</h4>
						<p>{OMG_PROJECT.tagline}</p>
						<div class="project-links">
							<a
								href={resolve('/work/omg')}
								onclick={() => clientTelemetry?.recordPortfolioAction('featured_omg_open')}
								>Read the OMG case study <ArrowUpRight size={15} weight="bold" /></a
							>
							<a
								href={OMG_PROJECT.demoUrl}
								target="_blank"
								rel="external noopener"
								onclick={() => clientTelemetry?.recordPortfolioAction('omg_site_open')}
								>Visit OMG <ArrowUpRight size={15} weight="bold" /></a
							>
							<a href={OMG_PROJECT.repoUrl} target="_blank" rel="external noopener"
								><GithubLogo size={15} weight="fill" /> Source</a
							>
						</div>
					</div>
				</article>

				<article class="project project-deploylint">
					<a
						class="project-image"
						href={resolve('/work/deploylint')}
						onclick={() => clientTelemetry?.recordPortfolioAction('featured_deploylint_open')}
						aria-label="Read the DeployLint case study"
					>
						<img
							src={deploylintImage}
							alt="DeployLint preview showing its repository-specific GitHub Actions setup"
							width="1440"
							height="900"
							loading="lazy"
						/>
					</a>
					<div class="project-copy">
						<p class="project-kind">02 / TypeScript / CI/CD</p>
						<h3>DeployLint</h3>
						<h4>Repository-aware GitHub Actions setup</h4>
						<p>{DEPLOYLINT_PROJECT.tagline}</p>
						<div class="project-links">
							<a
								href={resolve('/work/deploylint')}
								onclick={() => clientTelemetry?.recordPortfolioAction('featured_deploylint_open')}
								>Read the DeployLint case study <ArrowUpRight size={15} weight="bold" /></a
							>
							<a
								href={DEPLOYLINT_PROJECT.demoUrl}
								target="_blank"
								rel="external noopener"
								onclick={() => clientTelemetry?.recordPortfolioAction('deploylint_site_open')}
								>Visit DeployLint <ArrowUpRight size={15} weight="bold" /></a
							>
						</div>
					</div>
				</article>

				<aside id="tokens" class="side-project" aria-labelledby="tokens-heading">
					<div>
						<p class="section-label">Personal experiment / live dashboard</p>
						<h3 id="tokens-heading">Token Control</h3>
						<p>
							I built this to make my AI-assisted coding activity visible. It tracks token volume,
							model and provider mix, cache use, and estimated API-equivalent spend across my tools.
						</p>
					</div>
					<a href={TOKEN_CONTROL_URL} target="_blank" rel="external noopener"
						>Explore the live dashboard <ArrowUpRight size={15} weight="bold" /></a
					>
				</aside>
			</section>

			<section class="usage-section" aria-labelledby="usage-heading">
				<div>
					<p class="section-label">A glimpse of the process</p>
					<h2 id="usage-heading">The signal behind the work.</h2>
					<p>
						A recorded 30-day Codex usage snapshot, September 3–October 2, 2026. These numbers
						describe the tools I use; the projects above show what I build.
					</p>
				</div>
				<dl>
					<div>
						<dt>Recorded tokens, including cache</dt>
						<dd>12.60<span>B</span></dd>
					</div>
					<div>
						<dt>Recorded requests</dt>
						<dd>93,359</dd>
					</div>
					<div>
						<dt>Output tokens</dt>
						<dd>28.20<span>M</span></dd>
					</div>
				</dl>
				<p class="usage-note">
					Fixed snapshot, not lifetime usage. Cached tokens are reused context, not newly written
					code. Requests are recorded usage events, not unique projects. <a
						href={TOKEN_CONTROL_URL}
						target="_blank"
						rel="external noreferrer">Explore Token Control</a
					>
				</p>
			</section>
			<section class="capabilities human-section" aria-labelledby="capabilities-heading">
				<header>
					<p class="section-label">How I work</p>
					<h2 id="capabilities-heading">I trace the problem through the code and the system.</h2>
					<p>
						I work on Rust CLIs, TypeScript applications, Svelte interfaces, and Cloudflare
						deployments. My projects cover native package integrations, GitHub Apps, CI/CD, and
						release automation.
					</p>
					<a href={resolve('/about')}
						>Read how I got here <ArrowUpRight size={15} weight="bold" /></a
					>
				</header>
				<div class="capability-list">
					<img
						class="builder-portrait"
						src="/portrait.webp"
						width="640"
						height="642"
						alt="Olen Latham, software developer in McKinney, Texas"
						loading="lazy"
					/>
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
					<h2 id="contact-heading">Let's talk about your software team.</h2>
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
					<p>
						{PUBLIC_CONTACT_EMAIL}<br /><a
							href={resumeUrl}
							download
							onclick={() => clientTelemetry?.recordPortfolioAction('resume_download')}
							>{PUBLIC_RESUME_LINE}</a
						>
					</p>
				</div>
			</section>
		</div>
	</main>
</PublicShell>
