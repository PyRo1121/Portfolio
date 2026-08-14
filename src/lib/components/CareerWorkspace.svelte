<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowUpRight,
		BookOpen,
		Briefcase,
		CalendarBlank,
		CheckCircle,
		Plus,
		Target,
		UserFocus
	} from 'phosphor-svelte';
	import { careerStages, type CareerSnapshot } from '$lib/domain/career-accountability';
	import { createCareerView } from '$lib/domain/career-view';

	type CareerPanel = 'pipeline' | 'commitments' | 'stories';
	type Props = {
		readonly snapshot: CareerSnapshot | null;
		readonly accessReason: string;
		readonly today: string;
		readonly actionMessage: string;
	};

	let { snapshot, accessReason, today, actionMessage }: Props = $props();
	let mobilePanel = $state<CareerPanel>('pipeline');
	const view = $derived(snapshot === null ? null : createCareerView(snapshot, today));
	const panels: ReadonlyArray<{ readonly id: CareerPanel; readonly label: string }> = [
		{ id: 'pipeline', label: 'Pipeline' },
		{ id: 'commitments', label: 'Commitments' },
		{ id: 'stories', label: 'Stories' }
	];
</script>

<div class="career-screen">
	<nav class="workspace-pages" aria-label="Career panels">
		{#each panels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>

	<header class="career-overview">
		<div>
			<span><Briefcase size={14} weight="fill" /> Private accountability</span>
			<h1>Get hired.</h1>
			<p>Ship evidence. Tell the story. Put it in front of startup teams.</p>
		</div>
		{#if snapshot !== null}
			<section aria-label="Career summary">
				<div><strong>{snapshot.summary.activeOpportunities}</strong><span>active roles</span></div>
				<div><strong>{snapshot.summary.interviewing}</strong><span>interviewing</span></div>
				<div class={snapshot.summary.overdueActions > 0 ? 'attention' : ''}>
					<strong>{snapshot.summary.overdueActions}</strong><span>follow-ups due</span>
				</div>
				<div><strong>{snapshot.summary.storyDrafts}</strong><span>stories ready</span></div>
			</section>
		{:else}
			<section class="career-locked">
				<UserFocus size={20} weight="duotone" /><strong>Owner-only workspace</strong><span
					>{accessReason}</span
				>
			</section>
		{/if}
		{#if actionMessage}<p class="career-message" aria-live="polite">{actionMessage}</p>{/if}
	</header>

	{#if snapshot !== null && view !== null}
		<section
			class={mobilePanel === 'pipeline' ? 'career-pipeline panel-visible' : 'career-pipeline'}
		>
			<header>
				<div>
					<span>Opportunity pipeline</span><small>Deliberate applications over volume</small>
				</div>
				<details class="career-create">
					<summary><Plus size={13} /> Add opportunity</summary>
					<form method="POST" action="?/createOpportunity" use:enhance>
						<label>Company<input name="company" maxlength="180" required /></label>
						<label>Role<input name="role" maxlength="180" required /></label>
						<label>Job URL<input name="jobUrl" type="url" maxlength="2048" /></label>
						<label
							>Stage<select name="stage"
								>{#each careerStages as stage (stage)}<option>{stage}</option>{/each}</select
							></label
						>
						<label class="wide">Next action<input name="nextAction" maxlength="180" /></label>
						<label>Due<input name="nextActionDue" type="date" /></label>
						<label>Contact<input name="contact" maxlength="180" /></label>
						<label>Résumé version<input name="resumeVersion" maxlength="180" /></label>
						<label class="wide"
							>Private notes<textarea name="notes" maxlength="2000"></textarea></label
						>
						<button type="submit">Save opportunity</button>
					</form>
				</details>
			</header>
			<div class="pipeline-columns">
				{#each view.columns as column (column.stage)}
					<article class={column.opportunities.length === 0 ? 'empty-column' : ''}>
						<header>
							<span>{column.stage}</span><strong>{column.opportunities.length}</strong>
						</header>
						<div>
							{#each column.opportunities as opportunity (opportunity.id)}
								<section class="opportunity-card">
									<div>
										<strong>{opportunity.company}</strong><span>{opportunity.role}</span>
										{#if opportunity.jobUrl}<a
												href={opportunity.jobUrl}
												target="_blank"
												rel="external noreferrer"
												aria-label={`Open ${opportunity.company} role`}
												><ArrowUpRight size={13} /></a
											>{/if}
									</div>
									{#if opportunity.nextAction}<p>{opportunity.nextAction}</p>{/if}
									{#if opportunity.nextActionDue}<time
											class={opportunity.nextActionDue < today ? 'overdue' : ''}
											datetime={opportunity.nextActionDue}
											><CalendarBlank size={12} /> {opportunity.nextActionDue}</time
										>{/if}
									<form method="POST" action="?/transitionOpportunity" use:enhance>
										<input type="hidden" name="id" value={opportunity.id} />
										<select name="stage" aria-label={`Move ${opportunity.company} to stage`}>
											{#each careerStages as stage (stage)}<option
													selected={stage === opportunity.stage}>{stage}</option
												>{/each}
										</select><button type="submit">Move</button>
									</form>
								</section>
							{:else}<p class="empty">No roles</p>{/each}
						</div>
					</article>
				{/each}
			</div>
		</section>

		<section
			class={mobilePanel === 'commitments'
				? 'career-commitments panel-visible'
				: 'career-commitments'}
		>
			<header><span>Two-track commitment</span><small>Build + career</small></header>
			<form class="commitment-form" method="POST" action="?/createCommitment" use:enhance>
				<select name="kind" aria-label="Commitment type"
					><option>Build</option><option>Career</option></select
				>
				<input name="text" maxlength="180" placeholder="One concrete finish" required />
				<input name="dueOn" type="date" aria-label="Commitment due date" />
				<button type="submit"><Plus size={13} /> Add</button>
			</form>
			<div class="commitment-list">
				{#each view.openCommitments as commitment (commitment.id)}
					<article>
						<span>{commitment.kind}</span><strong>{commitment.text}</strong>
						{#if commitment.dueOn}<time datetime={commitment.dueOn}>{commitment.dueOn}</time>{/if}
						<form method="POST" action="?/setCommitmentStatus" use:enhance>
							<input type="hidden" name="id" value={commitment.id} />
							<input type="hidden" name="status" value="Done" />
							<button type="submit"><CheckCircle size={14} /> Done</button>
						</form>
					</article>
				{:else}<p class="empty">Set one build commitment and one career commitment.</p>{/each}
			</div>
			{#if view.nextActions.length > 0}
				<footer>
					<Target size={14} /><span>Next follow-up</span><strong
						>{view.nextActions[0]?.nextAction}</strong
					>
				</footer>
			{/if}
		</section>

		<section class={mobilePanel === 'stories' ? 'career-stories panel-visible' : 'career-stories'}>
			<header><span>Interview story bank</span><small>Problem → action → outcome</small></header>
			<details class="story-create">
				<summary><BookOpen size={13} /> Draft a story</summary>
				<form method="POST" action="?/createStory" use:enhance>
					<input name="title" maxlength="180" placeholder="Story title" required />
					<textarea name="problem" maxlength="2000" placeholder="Problem" required></textarea>
					<textarea name="action" maxlength="2000" placeholder="Action" required></textarea>
					<textarea name="outcome" maxlength="2000" placeholder="Outcome" required></textarea>
					<input name="evidenceUrl" type="url" maxlength="2048" placeholder="Evidence URL" />
					<select name="visibility" aria-label="Story visibility"
						><option>Private</option><option>ShareDraft</option></select
					>
					<button type="submit">Save story</button>
				</form>
			</details>
			<div class="story-list">
				{#each snapshot.stories as story (story.id)}
					<article>
						<span>{story.visibility}</span><strong>{story.title}</strong>
						<p>{story.outcome}</p>
						{#if story.evidenceUrl}<a
								href={story.evidenceUrl}
								target="_blank"
								rel="external noreferrer">Evidence <ArrowUpRight size={12} /></a
							>{/if}
					</article>
				{:else}<p class="empty">
						Turn the next shipped feature into an interview-ready story.
					</p>{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.career-screen {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
		grid-template-rows: auto minmax(0, 0.95fr) minmax(0, 1.05fr);
		gap: 1px;
		height: 100%;
		min-height: 0;
		background: var(--line);
	}
	:global(.career-screen .workspace-pages) {
		display: none;
	}
	.career-overview,
	.career-pipeline,
	.career-commitments,
	.career-stories {
		min-width: 0;
		min-height: 0;
		background: var(--surface);
	}
	.career-overview {
		position: relative;
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: minmax(17rem, 1fr) auto;
		align-items: end;
		gap: 2rem;
		padding: clamp(1rem, 2vw, 1.7rem);
		background:
			radial-gradient(circle at 80% -50%, rgb(216 165 74 / 15%), transparent 45%),
			var(--surface-deep);
	}
	.career-overview > div > span,
	.career-overview p,
	.career-overview section span,
	.career-pipeline > header,
	.career-commitments > header,
	.career-stories > header {
		font: 500 0.51rem/1.2 var(--mono);
		text-transform: uppercase;
		letter-spacing: 0.055em;
	}
	.career-overview > div > span {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
	}
	.career-overview h1 {
		margin: 0.35rem 0 0;
		font-size: clamp(2.5rem, 5vw, 5rem);
		font-weight: 620;
		line-height: 0.82;
		letter-spacing: -0.075em;
	}
	.career-overview > div > p {
		margin: 0.75rem 0 0;
		color: var(--muted);
	}
	.career-overview > section {
		display: flex;
		gap: clamp(1rem, 2.5vw, 2.8rem);
	}
	.career-overview section div {
		display: grid;
		gap: 0.22rem;
	}
	.career-overview section strong {
		font: 620 clamp(1.3rem, 2.4vw, 2.1rem)/1 var(--mono);
	}
	.career-overview section .attention strong {
		color: var(--accent);
	}
	.career-overview section span {
		color: var(--muted);
	}
	.career-locked {
		align-items: center;
		color: var(--accent);
	}
	.career-message {
		position: absolute;
		right: 1rem;
		bottom: 0.5rem;
		margin: 0;
		color: var(--accent) !important;
	}
	.career-pipeline {
		position: relative;
		grid-row: 2 / 4;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
	}
	.career-commitments,
	.career-stories {
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		overflow: hidden;
	}
	.career-pipeline > header,
	.career-commitments > header,
	.career-stories > header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.68rem 0.78rem;
		border-bottom: 1px solid var(--line);
		color: var(--muted);
	}
	.career-pipeline > header > div {
		display: grid;
		gap: 0.15rem;
	}
	.career-create {
		position: relative;
	}
	summary {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--accent);
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.career-create > form {
		position: absolute;
		z-index: 5;
		top: calc(100% + 0.7rem);
		right: 0;
		display: grid;
		width: min(34rem, 78vw);
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
		padding: 0.8rem;
		border: 1px solid var(--strong);
		background: var(--surface-deep);
		box-shadow: 0 1rem 3rem rgb(0 0 0 / 45%);
	}
	label {
		display: grid;
		gap: 0.25rem;
		font: 500 0.45rem/1 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
	}
	label.wide {
		grid-column: span 2;
	}
	input,
	select,
	textarea {
		min-width: 0;
		padding: 0.48rem;
		border: 1px solid var(--line);
		border-radius: 0;
		background: var(--bg);
		color: var(--ink);
		font: 480 0.58rem/1.25 var(--mono);
	}
	textarea {
		min-height: 3.2rem;
		resize: vertical;
	}
	form button,
	.career-create summary,
	.story-create summary {
		padding: 0.48rem 0.62rem;
		border: 1px solid var(--strong);
		background: transparent;
		color: var(--accent);
		font: 550 0.48rem/1 var(--mono);
		text-transform: uppercase;
		cursor: pointer;
	}
	.pipeline-columns {
		display: grid;
		grid-template-columns: repeat(7, minmax(9rem, 1fr));
		min-height: 0;
		overflow-x: auto;
	}
	.pipeline-columns > article {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		min-width: 0;
		border-right: 1px solid var(--line);
	}
	.pipeline-columns > article > header {
		display: flex;
		justify-content: space-between;
		padding: 0.55rem;
		border-bottom: 1px solid var(--line);
		font: 500 0.46rem/1 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
	}
	.pipeline-columns > article > div {
		min-height: 0;
		overflow-y: auto;
	}
	.opportunity-card {
		display: grid;
		gap: 0.45rem;
		padding: 0.62rem;
		border-bottom: 1px solid var(--line);
	}
	.opportunity-card > div {
		position: relative;
		display: grid;
		gap: 0.15rem;
		padding-right: 1.2rem;
	}
	.opportunity-card > div strong {
		font-size: 0.68rem;
	}
	.opportunity-card > div span,
	.opportunity-card p {
		font: 450 0.48rem/1.35 var(--mono);
		color: var(--muted);
	}
	.opportunity-card > div a {
		position: absolute;
		top: 0;
		right: 0;
		color: var(--accent);
	}
	.opportunity-card p {
		margin: 0;
		color: var(--ink);
	}
	.opportunity-card time {
		display: flex;
		gap: 0.3rem;
		align-items: center;
		font: 480 0.45rem/1 var(--mono);
		color: var(--muted);
	}
	.opportunity-card time.overdue {
		color: #d18070;
	}
	.opportunity-card form {
		display: grid;
		grid-template-columns: 1fr auto;
	}
	.opportunity-card form select,
	.opportunity-card form button {
		font-size: 0.43rem;
	}
	.commitment-form {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		border-bottom: 1px solid var(--line);
	}
	.commitment-form > * {
		border-width: 0 1px 0 0;
	}
	.commitment-list,
	.story-list {
		min-height: 0;
		overflow-y: auto;
	}
	.commitment-list article {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 0.55rem;
		align-items: center;
		padding: 0.65rem;
		border-bottom: 1px solid var(--line);
	}
	.commitment-list article > span,
	.story-list article > span {
		font: 520 0.43rem/1 var(--mono);
		color: var(--accent);
		text-transform: uppercase;
	}
	.commitment-list article > strong {
		font-size: 0.62rem;
	}
	.commitment-list time {
		font: 450 0.44rem/1 var(--mono);
		color: var(--muted);
	}
	.commitment-list form {
		grid-column: 1 / -1;
	}
	.commitment-list form button {
		padding: 0.35rem;
	}
	.career-commitments footer {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr);
		gap: 0.4rem;
		padding: 0.55rem;
		border-top: 1px solid var(--line);
		font: 480 0.47rem/1.3 var(--mono);
		color: var(--accent);
	}
	.story-create {
		border-bottom: 1px solid var(--line);
	}
	.story-create summary {
		border: 0;
	}
	.story-create form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem;
		padding: 0.55rem;
	}
	.story-create textarea {
		min-height: 2.6rem;
	}
	.story-list article {
		display: grid;
		gap: 0.3rem;
		padding: 0.65rem;
		border-bottom: 1px solid var(--line);
	}
	.story-list article strong {
		font-size: 0.65rem;
	}
	.story-list article p {
		margin: 0;
		font: 450 0.48rem/1.4 var(--mono);
		color: var(--muted);
	}
	.story-list article a {
		display: flex;
		gap: 0.3rem;
		align-items: center;
		color: var(--accent);
		font: 500 0.45rem/1 var(--mono);
		text-decoration: none;
	}
	.empty {
		margin: 0;
		padding: 0.8rem;
		font: 450 0.48rem/1.4 var(--mono);
		color: var(--muted);
	}
	@media (max-width: 1180px) {
		.career-screen {
			grid-template-columns: minmax(0, 1.15fr) minmax(17rem, 0.85fr);
		}
		.career-overview {
			grid-template-columns: 1fr auto;
		}
		.career-overview section div:nth-child(2),
		.career-overview section div:nth-child(4) {
			display: none;
		}
	}
	@media (max-width: 900px) {
		.career-screen {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto minmax(0, 1fr);
		}
		:global(.career-screen .workspace-pages) {
			display: flex;
		}
		.career-overview {
			grid-column: 1;
			grid-template-columns: 1fr auto;
			padding: 0.8rem;
		}
		.career-overview h1 {
			font-size: 2.3rem;
		}
		.career-overview > div > p,
		.career-overview section div:not(:first-child) {
			display: none;
		}
		.career-pipeline,
		.career-commitments,
		.career-stories {
			display: none;
			grid-column: 1;
			grid-row: 3;
		}
		.career-pipeline.panel-visible,
		.career-commitments.panel-visible,
		.career-stories.panel-visible {
			display: grid;
		}
		.career-pipeline {
			grid-row: 3;
		}
		.pipeline-columns {
			grid-template-columns: minmax(0, 1fr);
			overflow-x: hidden;
			overflow-y: auto;
		}
		.pipeline-columns > article.empty-column {
			display: none;
		}
		.career-create > form {
			position: fixed;
			top: 6.5rem;
			right: 0.75rem;
			left: 0.75rem;
			width: auto;
			grid-template-columns: 1fr 1fr;
			max-height: calc(100dvh - 10rem);
			overflow-y: auto;
		}
	}
	@media (max-width: 430px) {
		.career-overview {
			grid-template-columns: 1fr;
		}
		.career-overview > section {
			display: none;
		}
		.commitment-form {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.commitment-form input[type='date'],
		.commitment-form button {
			grid-column: span 1;
		}
		.story-create form {
			grid-template-columns: 1fr;
		}
	}
</style>
