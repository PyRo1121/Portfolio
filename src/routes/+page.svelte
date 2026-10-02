<script lang="ts">
	import PublicShell from '$lib/components/PublicShell.svelte';
	import CinematicHero from '$lib/components/CinematicHero.svelte';
	import PortfolioSpace from '$lib/components/PortfolioSpace.svelte';
	import ProjectObservatory from '$lib/components/ProjectObservatory.svelte';
	import '$lib/styles/portfolio-home.css';
	import { asset, resolve } from '$app/paths';
	import {
		ArrowUpRightIcon as ArrowUpRight,
		EnvelopeSimpleIcon as EnvelopeSimple,
		LinkedinLogoIcon as LinkedinLogo
	} from 'phosphor-svelte';
	import PublicSeoHead from '$lib/components/PublicSeoHead.svelte';
	import { TOKEN_CONTROL_URL } from '$lib/domain/showcase';
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

	const resumeUrl = asset('/olen-latham-resume.pdf');
</script>

<PublicSeoHead seo={homeSeo} />
<PublicShell>
	<a class="skip-link" href="#work">Skip to projects</a>
	<main id="portfolio-content" tabindex="-1">
		<CinematicHero telemetry={clientTelemetry} />
		<div class="portfolio-content">
			<PortfolioSpace />
			<ProjectObservatory telemetry={clientTelemetry} />

			<section class="usage-section" aria-labelledby="usage-heading">
				<div>
					<h2 id="usage-heading">A month at the keyboard.</h2>
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
				<figure class="human-portrait">
					<div class="portrait-orbit" aria-hidden="true"></div>
					<img
						class="builder-portrait"
						src="/portrait.webp"
						width="640"
						height="642"
						alt="Olen Latham, software developer in McKinney, Texas"
						loading="lazy"
					/>
					<figcaption>
						Somewhere in McKinney, Texas.<span>Usually working on an idea.</span>
					</figcaption>
				</figure>
				<header>
					<p class="section-label">Behind the keyboard</p>
					<h2 id="capabilities-heading">I stay with<br />the problem.</h2>
					<p>
						I started in customer service. The habit of listening, investigating, and following
						through came with me into software. These days, that means Rust tools, TypeScript apps,
						and the cloud systems behind them.
					</p>
					<a href={resolve('/about')}
						>Read how I got here <ArrowUpRight size={15} weight="bold" /></a
					>
				</header>
				<div class="capability-list">
					<article>
						<div>
							<h3>Find the cause.</h3>
							<p>
								Turn vague symptoms into a reproducible issue, explain what is known, and keep the
								next step clear.
							</p>
						</div>
					</article>
					<article>
						<div>
							<h3>Build the tool.</h3>
							<p>
								Build typed CLIs, interfaces, and integrations that replace repetitive work with a
								dependable path.
							</p>
						</div>
					</article>
					<article>
						<div>
							<h3>See it through.</h3>
							<p>
								Trace credentials, APIs, caches, deployments, and failure boundaries instead of
								treating production as a black box.
							</p>
						</div>
					</article>
				</div>
			</section>

			<section id="contact" class="closing" aria-labelledby="contact-heading">
				<div class="closing-horizon" aria-hidden="true"><span></span></div>
				<div>
					<p class="section-label">Open to the next thing</p>
					<h2 id="contact-heading">What are<br />you building?</h2>
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
