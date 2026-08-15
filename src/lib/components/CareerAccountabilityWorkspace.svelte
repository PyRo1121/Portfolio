<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		ArrowUpRight,
		BookOpen,
		Briefcase,
		CalendarBlank,
		CheckCircle,
		DownloadSimple,
		PencilSimple,
		Plus,
		Target,
		UserFocus
	} from 'phosphor-svelte';
	import { careerStages, type CareerSnapshot } from '$lib/domain/career-accountability';
	import type { CareerAccountabilityReview } from '$lib/domain/career-review';
	import type { CareerStoryEvidenceOption } from '$lib/domain/career-story-evidence';
	import { createCareerStoryView } from '$lib/domain/career-story-view';
	import { createCareerAccountabilityView } from '$lib/domain/career-workspace-view';
	import AccountabilityReview from './AccountabilityReview.svelte';

	type CareerPanel = 'review' | 'pipeline' | 'commitments' | 'stories';
	type Props = {
		readonly snapshot: CareerSnapshot | null;
		readonly evidenceOptions: ReadonlyArray<CareerStoryEvidenceOption>;
		readonly review: CareerAccountabilityReview | null;
		readonly accessReason: string;
		readonly today: string;
		readonly actionMessage: string;
	};

	let { snapshot, evidenceOptions, review, accessReason, today, actionMessage }: Props = $props();
	let mobilePanel = $state<CareerPanel>('review');
	const view = $derived(snapshot === null ? null : createCareerAccountabilityView(snapshot, today));
	const storyView = $derived(snapshot === null ? null : createCareerStoryView(snapshot));
	const portfolioExportUrl = resolve('/career/portfolio.md');
	const panels: ReadonlyArray<{ readonly id: CareerPanel; readonly label: string }> = [
		{ id: 'review', label: 'Summary' },
		{ id: 'pipeline', label: 'Opportunities' },
		{ id: 'commitments', label: 'Commitments' },
		{ id: 'stories', label: 'Stories' }
	];
	const enhanceAndCloseEditor: SubmitFunction = ({ formElement }) => {
		const editor = formElement.closest('details');
		return async ({ result, update }) => {
			if (result.type === 'success') editor?.removeAttribute('open');
			await update();
		};
	};

	function closeEditor(event: MouseEvent & { currentTarget: HTMLButtonElement }): void {
		event.currentTarget.closest('details')?.removeAttribute('open');
	}
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
			<span><Briefcase size={14} weight="fill" /> Owner-only records</span>
			<h1>Career</h1>
			<p>Applications, follow-ups, commitments, and interview stories.</p>
		</div>
		{#if snapshot !== null && view !== null}
			<section aria-label="Career summary">
				<div><strong>{snapshot.summary.activeOpportunities}</strong><span>active roles</span></div>
				<div><strong>{snapshot.summary.interviewing}</strong><span>interviewing</span></div>
				<div class={view.overdueFollowUps > 0 ? 'attention' : ''}>
					<strong>{view.overdueFollowUps}</strong><span>overdue follow-ups</span>
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
		<nav class="career-mode-switch" aria-label="Career workspace mode">
			<button
				type="button"
				class={mobilePanel === 'review' ? 'active' : ''}
				aria-pressed={mobilePanel === 'review'}
				onclick={() => (mobilePanel = 'review')}>Review</button
			><button
				type="button"
				class={mobilePanel === 'review' ? '' : 'active'}
				aria-pressed={mobilePanel !== 'review'}
				onclick={() => (mobilePanel = 'pipeline')}>Manage</button
			>
		</nav>
		{#if actionMessage}<p class="career-message" aria-live="polite">{actionMessage}</p>{/if}
	</header>

	{#if snapshot !== null && view !== null}
		{#if mobilePanel === 'review'}
			<AccountabilityReview {review} />
		{:else}
			<section
				class={mobilePanel === 'pipeline' ? 'career-pipeline panel-visible' : 'career-pipeline'}
			>
				<header>
					<div>
						<span>Opportunities</span><small>Applications and follow-ups</small>
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
										<details class="opportunity-edit">
											<summary><PencilSimple size={12} /> Edit details</summary>
											<form
												method="POST"
												action="?/updateOpportunity"
												aria-label={`Edit ${opportunity.company}`}
												use:enhance={enhanceAndCloseEditor}
											>
												<input type="hidden" name="id" value={opportunity.id} />
												<label
													>Company<input
														name="company"
														value={opportunity.company}
														maxlength="180"
														required
													/></label
												>
												<label
													>Role<input
														name="role"
														value={opportunity.role}
														maxlength="180"
														required
													/></label
												>
												<label
													>Job URL<input
														name="jobUrl"
														type="url"
														value={opportunity.jobUrl ?? ''}
														maxlength="2048"
													/></label
												>
												<label
													>Stage<select name="stage"
														>{#each careerStages as stage (stage)}<option
																selected={stage === opportunity.stage}>{stage}</option
															>{/each}</select
													></label
												>
												<label class="wide"
													>Next action<input
														name="nextAction"
														value={opportunity.nextAction ?? ''}
														maxlength="180"
													/></label
												>
												<label
													>Due<input
														name="nextActionDue"
														type="date"
														value={opportunity.nextActionDue ?? ''}
													/></label
												>
												<label
													>Contact<input
														name="contact"
														value={opportunity.contact ?? ''}
														maxlength="180"
													/></label
												>
												<label
													>Résumé version<input
														name="resumeVersion"
														value={opportunity.resumeVersion ?? ''}
														maxlength="180"
													/></label
												>
												<label class="wide"
													>Private notes<textarea name="notes" maxlength="2000"
														>{opportunity.notes ?? ''}</textarea
													></label
												>
												<div class="edit-actions">
													<button type="button" onclick={closeEditor}>Close</button>
													<button type="submit">Save changes</button>
												</div>
											</form>
										</details>
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
				<header><span>Current commitments</span><small>Build + career</small></header>
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
				<footer class="follow-up-reminders">
					<header>
						<div><Target size={14} /><span>Follow-ups due</span></div>
						<small>Dashboard · recalculated daily</small>
					</header>
					<div>
						{#each view.followUpReminders as reminder (reminder.opportunityId)}
							<article>
								<span class={reminder.tone}>{reminder.label}</span>
								<strong>{reminder.company}</strong>
								<p>{reminder.action}</p>
							</article>
						{:else}<p class="empty">Add a next action to create a dashboard reminder.</p>{/each}
					</div>
				</footer>
			</section>

			<section
				class={mobilePanel === 'stories' ? 'career-stories panel-visible' : 'career-stories'}
			>
				<header>
					<div><span>Interview stories</span><small>Problem → action → outcome</small></div>
					{#if storyView !== null && storyView.canExport}
						<a
							class="story-export"
							href={portfolioExportUrl}
							title="Sanitized Markdown; Private stories and Career records are excluded"
							download
							data-sveltekit-reload
							><DownloadSimple size={12} /> Export ShareDrafts · {storyView.shareDraftCount}</a
						>
					{:else}
						<span class="story-export-unavailable">Mark ShareDraft to export</span>
					{/if}
				</header>
				<details class="story-create">
					<summary><BookOpen size={13} /> Draft a story</summary>
					<form method="POST" action="?/createStory" use:enhance>
						<input name="title" maxlength="180" placeholder="Story title" required />
						<textarea name="problem" maxlength="2000" placeholder="Problem" required></textarea>
						<textarea name="action" maxlength="2000" placeholder="Action" required></textarea>
						<textarea name="outcome" maxlength="2000" placeholder="Outcome" required></textarea>
						<select name="evidenceUrl" aria-label="Observed GitHub outcome">
							<option value="">No observed GitHub outcome</option>
							{#each evidenceOptions as evidence (evidence.url)}
								<option value={evidence.url}>{evidence.label}</option>
							{/each}
						</select>
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
							<dl class="story-sequence">
								<div>
									<dt>Problem</dt>
									<dd>{story.problem}</dd>
								</div>
								<div>
									<dt>Action</dt>
									<dd>{story.action}</dd>
								</div>
								<div>
									<dt>Outcome</dt>
									<dd>{story.outcome}</dd>
								</div>
							</dl>
							{#if story.evidence?._tag === 'Observed'}
								<a
									class="story-evidence observed"
									href={story.evidence.url}
									target="_blank"
									rel="external noreferrer"
									><span>Observed · {story.evidence.kind}</span>{story.evidence.title}<small
										>{story.evidence.repository}</small
									><ArrowUpRight size={12} /></a
								>
							{:else if story.evidence?._tag === 'Unavailable'}
								<p class="story-evidence unavailable">
									<span>Unavailable</span>{story.evidence.reason}
								</p>
							{:else}
								<p class="story-evidence unlinked"><span>Unlinked</span>No outcome selected.</p>
							{/if}
							<details class="story-edit">
								<summary><PencilSimple size={12} /> Edit story</summary>
								<form
									method="POST"
									action="?/updateStory"
									aria-label={`Edit ${story.title}`}
									use:enhance={enhanceAndCloseEditor}
								>
									<input type="hidden" name="id" value={story.id} />
									<label
										>Title<input name="title" value={story.title} maxlength="180" required /></label
									>
									<label
										>Visibility<select name="visibility"
											><option selected={story.visibility === 'Private'}>Private</option><option
												selected={story.visibility === 'ShareDraft'}>ShareDraft</option
											></select
										></label
									>
									<label class="wide"
										>Problem<textarea name="problem" maxlength="2000" required
											>{story.problem}</textarea
										></label
									>
									<label class="wide"
										>Action<textarea name="action" maxlength="2000" required
											>{story.action}</textarea
										></label
									>
									<label class="wide"
										>Outcome<textarea name="outcome" maxlength="2000" required
											>{story.outcome}</textarea
										></label
									>
									<label class="wide"
										>Observed GitHub outcome<select name="evidenceUrl">
											<option value="" selected={story.evidence?._tag !== 'Observed'}
												>No observed outcome</option
											>
											{#each evidenceOptions as evidence (evidence.url)}
												<option
													value={evidence.url}
													selected={story.evidence?._tag === 'Observed' &&
														story.evidence.url === evidence.url}>{evidence.label}</option
												>
											{/each}
										</select></label
									>
									<div class="edit-actions">
										<button type="button" onclick={closeEditor}>Close</button>
										<button type="submit">Save changes</button>
									</div>
								</form>
							</details>
						</article>
					{:else}<p class="empty">
							Add an interview story when an outcome is ready to discuss.
						</p>{/each}
				</div>
			</section>
		{/if}
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
	.career-mode-switch {
		position: absolute;
		top: 0.7rem;
		right: 0.8rem;
		display: flex;
		border: 1px solid var(--line);
	}
	.career-mode-switch button {
		padding: 0.42rem 0.58rem;
		border: 0;
		border-right: 1px solid var(--line);
		background: transparent;
		color: var(--muted);
		font: 520 0.45rem/1 var(--mono);
		text-transform: uppercase;
		cursor: pointer;
	}
	.career-mode-switch button:last-child {
		border-right: 0;
	}
	.career-mode-switch button.active {
		background: var(--accent);
		color: var(--bg);
	}
	:global(.career-screen > .accountability-review) {
		grid-column: 1 / -1;
		grid-row: 2 / 4;
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
	.career-commitments {
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr) auto;
		overflow: hidden;
	}
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
	.career-pipeline > header > div,
	.career-stories > header > div {
		display: grid;
		gap: 0.15rem;
	}
	.story-export,
	.story-export-unavailable {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font: 520 0.44rem/1 var(--mono);
		text-transform: uppercase;
	}
	.story-export {
		color: var(--accent);
		text-decoration: none;
	}
	.story-export-unavailable {
		color: var(--muted);
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
	.opportunity-edit > form,
	.story-edit > form {
		position: fixed;
		z-index: 12;
		top: clamp(5rem, 14vh, 8rem);
		left: 50%;
		display: grid;
		width: min(36rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 8rem);
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.65rem;
		overflow-y: auto;
		padding: 0.85rem;
		border: 1px solid var(--accent);
		background: var(--surface-deep);
		box-shadow: 0 1.2rem 4rem rgb(0 0 0 / 70%);
		transform: translateX(-50%);
	}
	.story-edit > form {
		grid-template-columns: repeat(2, minmax(0, 1fr));
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
	.opportunity-edit summary,
	.story-create summary,
	.story-edit summary {
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
	.opportunity-edit summary,
	.story-edit summary {
		width: fit-content;
		padding: 0.32rem 0.42rem;
		font-size: 0.42rem;
	}
	.edit-actions {
		display: flex;
		grid-column: 1 / -1;
		gap: 0.45rem;
		justify-content: flex-end;
	}
	.opportunity-card > form {
		display: grid;
		grid-template-columns: 1fr auto;
	}
	.opportunity-card > form select,
	.opportunity-card > form button {
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
	.follow-up-reminders {
		min-height: 0;
		border-top: 1px solid var(--line);
		font: 480 0.47rem/1.3 var(--mono);
	}
	.follow-up-reminders > header {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.6rem;
		color: var(--accent);
		text-transform: uppercase;
	}
	.follow-up-reminders > header div {
		display: flex;
		gap: 0.35rem;
		align-items: center;
	}
	.follow-up-reminders > header small {
		color: var(--muted);
	}
	.follow-up-reminders > div {
		display: flex;
		max-height: 5.2rem;
		overflow: auto;
		border-top: 1px solid var(--line);
	}
	.follow-up-reminders article {
		display: grid;
		min-width: 10rem;
		flex: 1;
		gap: 0.18rem;
		padding: 0.5rem 0.6rem;
		border-right: 1px solid var(--line);
	}
	.follow-up-reminders article span {
		color: var(--muted);
		text-transform: uppercase;
	}
	.follow-up-reminders article span.overdue,
	.follow-up-reminders article span.today {
		color: #d18070;
	}
	.follow-up-reminders article span.upcoming {
		color: var(--accent);
	}
	.follow-up-reminders article strong {
		font-size: 0.55rem;
	}
	.follow-up-reminders article p {
		margin: 0;
		color: var(--muted);
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
	.story-edit textarea {
		min-height: 4rem;
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
	.story-sequence {
		display: grid;
		gap: 0.35rem;
		margin: 0;
	}
	.story-sequence div {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.4rem;
	}
	.story-sequence dt {
		font: 520 0.42rem/1.4 var(--mono);
		color: var(--accent);
		text-transform: uppercase;
	}
	.story-sequence dd {
		margin: 0;
		font: 450 0.48rem/1.4 var(--mono);
		color: var(--muted);
	}
	.story-evidence {
		margin: 0;
		padding: 0.45rem;
		border-left: 1px solid var(--strong);
		font: 500 0.46rem/1.35 var(--mono);
	}
	.story-list article > a.story-evidence {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.14rem 0.4rem;
		color: var(--ink);
		text-decoration: none;
	}
	.story-evidence span {
		display: block;
		color: var(--accent);
		font-size: 0.4rem;
		text-transform: uppercase;
	}
	.story-evidence small {
		grid-column: 1;
		color: var(--muted);
	}
	.story-evidence.unavailable,
	.story-evidence.unlinked {
		color: var(--muted);
	}
	.story-evidence.unavailable span {
		color: #d18070;
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
		.career-mode-switch {
			display: none;
		}
		:global(.career-screen > .accountability-review) {
			grid-column: 1;
			grid-row: 3;
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
		.opportunity-edit > form,
		.story-edit > form {
			top: 5.5rem;
			grid-template-columns: 1fr 1fr;
			max-height: calc(100dvh - 9.5rem);
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
		.story-create form,
		.story-edit > form {
			grid-template-columns: 1fr;
		}
		.story-edit > form label.wide {
			grid-column: auto;
		}
	}
</style>
