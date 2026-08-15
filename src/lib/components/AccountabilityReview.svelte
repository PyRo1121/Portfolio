<script lang="ts">
	import { ArrowUpRight, Briefcase, Crosshair, Info, WarningCircle } from 'phosphor-svelte';
	import type { CareerAccountabilityReview } from '$lib/domain/career-review';

	type Props = { readonly review: CareerAccountabilityReview | null };
	let { review }: Props = $props();
</script>

<div class="accountability-review">
	{#if review === null}
		<section class="review-unavailable">
			<WarningCircle size={22} weight="duotone" />
			<span>Career review</span>
			<strong>Review evidence is temporarily unavailable.</strong>
			<p>
				Career records and engineering evidence remain isolated rather than substituting stale
				claims.
			</p>
		</section>
	{:else}
		<section class="review-outcome">
			<header>
				<div><Crosshair size={14} /><span>Selected completed outcome</span></div>
				<strong class={review.outcome.state.toLowerCase()}>{review.outcome.state}</strong>
			</header>
			<div class="outcome-copy">
				<span>{review.outcome.kindLabel}</span>
				<h2>{review.outcome.headline}</h2>
				<p>{review.outcome.detail}</p>
				{#if review.outcome.evidence}<a
						href={review.outcome.evidence.url}
						target="_blank"
						rel="external noreferrer">{review.outcome.evidence.label} <ArrowUpRight size={13} /></a
					>{/if}
			</div>
			<div class="outcome-verification">
				<span class={review.outcome.verification.state.toLowerCase()}
					>{review.outcome.verification.state}</span
				>
				<strong>Repository verification</strong>
				<p>{review.outcome.verification.detail}</p>
				{#if review.outcome.verification.evidence}<a
						href={review.outcome.verification.evidence.url}
						target="_blank"
						rel="external noreferrer"
						>{review.outcome.verification.evidence.label} <ArrowUpRight size={12} /></a
					>{/if}
			</div>
			<footer>
				<span>Selection basis</span>
				<p>{review.outcome.selectionFormula}</p>
			</footer>
		</section>

		<section class="review-commitments">
			<header>
				<Briefcase size={14} /><span>Current commitments</span><small
					>One build and one career item</small
				>
			</header>
			<div>
				<article>
					<span class={review.buildCommitment.state.toLowerCase()}
						>{review.buildCommitment.state}</span
					>
					<small>Build</small>
					<strong>{review.buildCommitment.text}</strong>
					{#if review.buildCommitment.dueOn}<time datetime={review.buildCommitment.dueOn}
							>{review.buildCommitment.dueLabel}</time
						>{:else}<time>{review.buildCommitment.dueLabel}</time>{/if}
				</article>
				<article>
					<span class={review.careerCommitment.state.toLowerCase()}
						>{review.careerCommitment.state}</span
					>
					<small>Career</small>
					<strong>{review.careerCommitment.text}</strong>
					{#if review.careerCommitment.dueOn}<time datetime={review.careerCommitment.dueOn}
							>{review.careerCommitment.dueLabel}</time
						>{:else}<time>{review.careerCommitment.dueLabel}</time>{/if}
				</article>
			</div>
		</section>

		<section class="review-coverage">
			<header>
				<div><Info size={14} /><span>Evidence coverage</span></div>
				<small>State and source for each lane</small>
			</header>
			<div>
				{#each review.coverage as lane (lane.id)}
					<article>
						<span class={lane.state.toLowerCase()}>{lane.state}</span>
						<strong>{lane.label}</strong>
						<p>{lane.detail}</p>
						{#if lane.evidence}<a
								href={lane.evidence.url}
								target="_blank"
								rel="external noreferrer"
								aria-label={`${lane.label}: ${lane.evidence.label}`}><ArrowUpRight size={11} /></a
							>{/if}
					</article>
				{/each}
			</div>
		</section>

		<section class="review-relevance">
			<header>
				<div><Info size={14} /><span>Evidence boundaries</span></div>
				<small>{review.date}</small>
			</header>
			<div class="relevance-copy">
				<ul>
					{#each review.coverage.filter( (lane) => ['typescript', 'verification', 'operations'].includes(lane.id) ) as lane (lane.id)}
						<li>
							<strong>{lane.label}</strong><span class={lane.state.toLowerCase()}>{lane.state}</span
							>
						</li>
					{/each}
				</ul>
				<p>{review.boundaryNote}</p>
			</div>
			<div class="follow-up-warning">
				<span>Overdue follow-ups</span>
				{#each review.followUpWarnings as warning (warning.opportunityId)}
					<article>
						<strong>{warning.company}</strong>
						<p>{warning.action}</p>
						<small class={warning.tone}>{warning.label}</small>
					</article>
				{:else}
					<p class="clear">No overdue or due-today follow-ups observed.</p>
				{/each}
				{#if review.followUpWarnings.length === 0 && review.nextFollowUp !== null}
					<footer>
						<span>Next scheduled</span><strong>{review.nextFollowUp.company}</strong>
						<p>{review.nextFollowUp.action} · {review.nextFollowUp.label}</p>
					</footer>
				{/if}
			</div>
		</section>
	{/if}
</div>

<style>
	.accountability-review {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(19rem, 0.85fr);
		grid-template-rows: minmax(0, 1.05fr) minmax(0, 0.95fr);
		gap: 1px;
		height: 100%;
		min-height: 0;
		background: var(--line);
	}
	.accountability-review > section {
		min-width: 0;
		min-height: 0;
		background: var(--surface);
	}
	.accountability-review section > header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.62rem 0.72rem;
		border-bottom: 1px solid var(--line);
		font: 570 0.68rem/1.2 var(--sans);
		color: var(--muted);
		letter-spacing: -0.01em;
	}
	.accountability-review section > header div {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.accountability-review section > header > strong,
	.accountability-review article > span,
	.outcome-verification > span {
		font: 560 0.52rem/1 var(--mono);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.observed,
	.measured,
	.provisioned {
		color: var(--accent) !important;
	}
	.inferred {
		color: #b8a77f !important;
	}
	.unavailable,
	.unscheduled {
		color: var(--muted) !important;
	}
	.review-outcome {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto auto;
		overflow: hidden;
	}
	.outcome-copy {
		display: grid;
		align-content: center;
		gap: 0.55rem;
		padding: clamp(0.9rem, 2vw, 1.5rem);
		background:
			radial-gradient(circle at 90% 0%, rgb(216 165 74 / 10%), transparent 45%), var(--surface-deep);
	}
	.outcome-copy > span,
	.review-commitments article small,
	.follow-up-warning > span,
	.outcome-verification > strong,
	.review-outcome footer span {
		font: 540 0.56rem/1 var(--mono);
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.055em;
	}
	.outcome-copy h2 {
		max-width: 26ch;
		margin: 0;
		font-size: clamp(1.55rem, 2.5vw, 2.6rem);
		font-weight: 610;
		line-height: 0.98;
		letter-spacing: -0.055em;
	}
	.outcome-copy p,
	.outcome-verification p,
	.review-outcome footer p,
	.review-coverage article p,
	.relevance-copy p,
	.follow-up-warning p {
		margin: 0;
		font: 450 0.62rem/1.48 var(--mono);
		color: var(--muted);
	}
	.outcome-copy a,
	.outcome-verification a {
		display: flex;
		width: fit-content;
		align-items: center;
		gap: 0.3rem;
		color: var(--accent);
		font: 520 0.57rem/1 var(--mono);
		text-decoration: none;
	}
	.outcome-verification {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.55rem;
		padding: 0.58rem 0.72rem;
		border-top: 1px solid var(--line);
	}
	.review-outcome footer {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.55rem;
		padding: 0.5rem 0.72rem;
		border-top: 1px solid var(--line);
	}
	.review-commitments {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
	}
	.review-commitments > div {
		display: grid;
		grid-template-rows: 1fr 1fr;
		min-height: 0;
	}
	.review-commitments article {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-rows: auto 1fr;
		gap: 0.4rem 0.55rem;
		align-items: start;
		padding: 0.8rem;
		border-bottom: 1px solid var(--line);
	}
	.review-commitments article strong {
		grid-column: 1 / -1;
		font-size: clamp(0.78rem, 1.2vw, 1rem);
		line-height: 1.25;
	}
	.review-commitments time {
		font: 500 0.56rem/1 var(--mono);
		color: var(--muted);
	}
	.review-coverage {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
	}
	.review-coverage > div {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		min-height: 0;
	}
	.review-coverage article {
		position: relative;
		display: grid;
		align-content: start;
		gap: 0.3rem;
		padding: 0.65rem;
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	.review-coverage article strong {
		font-size: 0.72rem;
	}
	.review-coverage article a {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		color: var(--accent);
	}
	.review-relevance {
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		overflow: hidden;
	}
	.relevance-copy {
		display: grid;
		gap: 0.6rem;
		padding: 0.72rem;
		border-bottom: 1px solid var(--line);
	}
	.relevance-copy ul {
		display: grid;
		gap: 1px;
		margin: 0;
		padding: 0;
		background: var(--line);
		list-style: none;
	}
	.relevance-copy li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.58rem;
		background: var(--high);
	}
	.relevance-copy li strong {
		font-size: 0.68rem;
		line-height: 1.25;
	}
	.relevance-copy li span {
		font: 560 0.5rem/1 var(--mono);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.follow-up-warning {
		min-height: 0;
		overflow-y: auto;
		padding: 0.62rem;
	}
	.follow-up-warning article {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.18rem 0.45rem;
		padding: 0.45rem 0;
		border-bottom: 1px solid var(--line);
	}
	.follow-up-warning article p {
		grid-column: 1;
	}
	.follow-up-warning article small {
		grid-column: 2;
		grid-row: 1 / 3;
		color: #d18070;
		font: 540 0.52rem/1 var(--mono);
		text-transform: uppercase;
	}
	.follow-up-warning .clear {
		margin-top: 0.55rem;
	}
	.follow-up-warning footer {
		display: grid;
		gap: 0.25rem;
		margin-top: 0.55rem;
		padding-top: 0.55rem;
		border-top: 1px solid var(--line);
	}
	.follow-up-warning footer span {
		color: var(--accent);
		font: 520 0.54rem/1 var(--mono);
		text-transform: uppercase;
	}
	.review-unavailable {
		grid-column: 1 / -1;
		grid-row: 1 / -1;
		display: grid;
		place-content: center;
		gap: 0.5rem;
		padding: 1rem;
		text-align: center;
	}
	.review-unavailable span {
		color: var(--accent);
		font: 520 0.48rem/1 var(--mono);
		text-transform: uppercase;
	}
	.review-unavailable p {
		max-width: 50ch;
		margin: 0;
		color: var(--muted);
	}
	@media (max-width: 1180px) {
		.accountability-review {
			grid-template-columns: minmax(0, 1.05fr) minmax(17rem, 0.95fr);
		}
		.review-coverage > div {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			overflow-y: auto;
		}
	}
	@media (max-width: 900px) {
		.accountability-review {
			display: block;
			height: 100%;
			overflow-y: auto;
		}
		.accountability-review > section {
			min-height: 0;
			border-bottom: 1px solid var(--line);
		}
		.review-outcome,
		.review-commitments,
		.review-coverage,
		.review-relevance {
			display: block;
			overflow: visible;
		}
		.review-commitments > div,
		.review-coverage > div {
			display: block;
		}
		.outcome-copy h2 {
			font-size: 1.75rem;
		}
		.review-coverage > div {
			overflow: visible;
		}
	}
	@media (max-width: 430px) {
		.outcome-verification {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.outcome-verification p,
		.outcome-verification a {
			grid-column: 1 / -1;
		}
		.review-coverage > div {
			grid-template-columns: 1fr;
		}
	}
</style>
