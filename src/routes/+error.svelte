<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ArrowRightIcon as ArrowRight } from 'phosphor-svelte';

	const isNotFound = $derived(page.status === 404);
	const heading = $derived(
		isNotFound ? 'This page isn’t part of the record.' : 'The dashboard hit a boundary.'
	);
	const detail = $derived(
		isNotFound
			? 'The address doesn’t match a published dashboard, case study, or public evidence page.'
			: 'This route could not be rendered. The public dashboard and case studies may still be available.'
	);
</script>

<svelte:head>
	<title>{page.status} — {isNotFound ? 'Page not found' : 'Route unavailable'} | Olen Latham</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a class="skip-link" href="#error-content">Skip to error details</a>

<main id="error-content" class="error-page" tabindex="-1">
	<nav class="topline" aria-label="Page navigation">
		<a href={resolve('/')}><span aria-hidden="true">←</span> Weeknote</a>
		<span>Error boundary</span>
	</nav>

	<section class="error-hero" aria-labelledby="error-heading">
		<p class="status-code" aria-hidden="true">{page.status}</p>
		<div class="error-copy">
			<p class="eyebrow">{isNotFound ? 'Route not published' : 'Route unavailable'}</p>
			<h1 id="error-heading">{heading}</h1>
			<p class="detail">{detail}</p>
			<nav class="recovery-links" aria-label="Recovery links">
				<a class="primary" href={resolve('/')}>
					Open the dashboard <ArrowRight size={16} weight="bold" />
				</a>
				<a href={resolve('/about')}>About Olen</a>
			</nav>
		</div>
	</section>

	<footer>
		<span>latham.cloud</span>
		<code>{page.url.pathname}</code>
	</footer>
</main>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		min-height: 100%;
		overflow: auto;
		background: #0b0d0e;
		color: #f0f0eb;
		font-family: 'Geist Variable', sans-serif;
	}
	:global(*) {
		box-sizing: border-box;
	}
	.error-page {
		display: grid;
		width: min(100% - 3rem, 74rem);
		min-height: 100dvh;
		grid-template-rows: auto minmax(0, 1fr) auto;
		margin: 0 auto;
		padding: 1.25rem 0 2rem;
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
	.topline a {
		display: inline-flex;
		gap: 0.55rem;
		color: #f0f0eb;
		text-decoration: none;
	}
	.topline a span,
	.eyebrow {
		color: #d8a54a;
	}
	.error-hero {
		display: grid;
		grid-template-columns: minmax(13rem, 0.58fr) minmax(0, 1.42fr);
		gap: clamp(3rem, 10vw, 9rem);
		align-items: center;
		padding: clamp(4rem, 10vw, 8rem) 0;
	}
	.status-code {
		margin: 0;
		color: transparent;
		font-size: clamp(8rem, 20vw, 15rem);
		font-weight: 720;
		line-height: 0.72;
		letter-spacing: -0.09em;
		-webkit-text-stroke: 1px rgb(216 165 74 / 72%);
	}
	.eyebrow {
		margin: 0 0 1.4rem;
		font:
			650 0.7rem/1.2 'JetBrains Mono Variable',
			monospace;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	h1 {
		max-width: 12ch;
		margin: 0;
		font-size: clamp(3.4rem, 7vw, 6.4rem);
		font-weight: 680;
		line-height: 0.92;
		letter-spacing: -0.065em;
		text-wrap: balance;
	}
	.detail {
		max-width: 42rem;
		margin: 2rem 0 0;
		color: #b2b6b1;
		font-size: clamp(1rem, 1.7vw, 1.2rem);
		line-height: 1.65;
		text-wrap: pretty;
	}
	.recovery-links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1.25rem;
		margin-top: 2rem;
	}
	.recovery-links a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #d8a54a;
		font-size: 0.82rem;
		font-weight: 650;
		text-decoration: none;
		transition:
			background 180ms ease,
			border-color 180ms ease,
			color 180ms ease,
			transform 180ms ease;
	}
	.recovery-links .primary {
		min-height: 2.8rem;
		padding: 0 1rem;
		border: 1px solid #d8a54a;
		background: #d8a54a;
		color: #0b0d0e;
	}
	.recovery-links .primary:hover,
	.recovery-links .primary:focus-visible {
		background: #e2b762;
	}
	.recovery-links a:active {
		transform: translateY(1px);
	}
	footer {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		padding-top: 1.2rem;
		border-top: 1px solid rgb(231 232 225 / 16%);
		color: #777c78;
		font:
			500 0.62rem/1.5 'JetBrains Mono Variable',
			monospace;
	}
	footer code {
		max-width: min(60vw, 36rem);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	a:focus-visible {
		outline: 2px solid #d8a54a;
		outline-offset: 4px;
	}
	@media (max-width: 720px) {
		.error-page {
			width: min(100% - 2rem, 40rem);
			padding-top: 0.75rem;
		}
		.topline > span {
			display: none;
		}
		.error-hero {
			grid-template-columns: 1fr;
			gap: 3rem;
			align-content: center;
			padding: 4rem 0 5rem;
		}
		.status-code {
			font-size: clamp(7rem, 38vw, 10rem);
		}
		h1 {
			font-size: clamp(3rem, 14vw, 4.6rem);
		}
		footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.35rem;
		}
		footer code {
			max-width: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.recovery-links a {
			transition: none;
		}
	}
</style>
