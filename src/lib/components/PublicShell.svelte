<script lang="ts">
	import type { Snippet } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getLoadedClientTelemetry } from '$lib/telemetry/telemetry-gate';
	import {
		PUBLIC_CONTACT_MAILTO,
		PUBLIC_GITHUB_URL,
		PUBLIC_LINKEDIN_URL
	} from '$lib/domain/public-seo';
	import '$lib/styles/public.css';
	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content="#040710" />
	<link
		rel="preload"
		href="/orbit/D-DIN.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
</svelte:head>

<div class="public-universe">
	<header class="public-header">
		<a class="orbit-wordmark" href={resolve('/')} aria-label="Olen Latham — portfolio home">
			<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"
				><ellipse
					cx="16"
					cy="16"
					rx="14"
					ry="5"
					transform="rotate(-35 16 16)"
					fill="none"
					stroke="currentColor"
					stroke-width="1.3"
				/><circle cx="16" cy="16" r="5" fill="currentColor" /></svg
			>
			<span>OLEN <i>/</i> IN ORBIT<small>Olen Latham · Software developer</small></span>
		</a>
		<nav aria-label="Portfolio navigation">
			<a href={resolve('/#work')}>Work</a>
			<a href={resolve('/about')} aria-current={page.url.pathname === '/about' ? 'page' : undefined}
				>The human</a
			>
			<a
				class="contact-link"
				href={PUBLIC_CONTACT_MAILTO}
				rel="external"
				onclick={() => getLoadedClientTelemetry()?.recordContact('email_header')}
				>Let’s talk <span aria-hidden="true">↗</span></a
			>
		</nav>
	</header>
	{@render children()}
	<footer class="public-footer">
		<div>
			<a class="footer-brand" href={resolve('/')}>Still looking up.</a>
			<p>A personal universe by Olen Latham.<br />Built from curiosity. Launched from Earth.</p>
		</div>
		<nav aria-label="Footer navigation">
			<a href={PUBLIC_GITHUB_URL} target="_blank" rel="external noreferrer">GitHub</a><a
				href={PUBLIC_LINKEDIN_URL}
				onclick={() => getLoadedClientTelemetry()?.recordContact('linkedin_social')}
				target="_blank"
				rel="external noreferrer">LinkedIn</a
			><a
				href={asset('/olen-latham-resume.pdf')}
				download
				onclick={() => getLoadedClientTelemetry()?.recordPortfolioAction('resume_download')}
				>Résumé</a
			><a
				href={PUBLIC_CONTACT_MAILTO}
				onclick={() => getLoadedClientTelemetry()?.recordContact('email_social')}
				rel="external">Email</a
			>
		</nav>
		<details class="scene-credits">
			<summary>Scene credits</summary>
			<p>
				Voyager model: <a
					href="https://science.nasa.gov/resource/voyager-3d-model/"
					target="_blank"
					rel="noreferrer">NASA / VTAD</a
				>. Earth and sky textures:
				<a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer"
					>Solar System Scope</a
				>,
				<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer"
					>CC BY 4.0</a
				>. D-DIN: SIL Open Font License. Original AI-assisted fallback artwork.
			</p>
		</details>
	</footer>
</div>
