<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		ArrowUpRightIcon,
		ArrowRightIcon,
		TerminalIcon,
		GitPullRequestIcon,
		ChartBarIcon,
		GithubLogoIcon,
		CopyIcon,
		CheckIcon
	} from 'phosphor-svelte';
	import { OMG_PROJECT, DEPLOYLINT_PROJECT, TOKEN_CONTROL_URL } from '$lib/domain/showcase';
	import type { ClientTelemetry } from '$lib/telemetry/client-telemetry';
	import '$lib/styles/project-observatory.css';
	let { telemetry = null }: { telemetry: ClientTelemetry | null } = $props();
	const projects = [
		{ id: 'omg', name: 'OMG', type: 'Developer tools', icon: TerminalIcon },
		{ id: 'deploylint', name: 'DeployLint', type: 'Release engineering', icon: GitPullRequestIcon },
		{ id: 'tokens', name: 'Token Control', type: 'Usage explorer', icon: ChartBarIcon }
	] as const;
	let active = $state(0);
	let commandIndex = $state(0);
	let workflowIndex = $state(0);
	let metricIndex = $state(0);
	let copied = $state(false);
	let copyFailed = $state(false);
	let canvas: HTMLCanvasElement;
	let projectList: HTMLDivElement;
	let updateScene: ((project: number) => void) | undefined;
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	const commands = [
		{
			label: 'Inspect a package',
			command: 'omg install ripgrep --dry-run',
			title: 'See the plan before changing anything.',
			description: 'Preview the package operation through the native backend for your system.',
			parts: ['Package request', 'Native backend', 'Install plan'],
			note: 'The dry run inspects the plan. It does not install the package.'
		},
		{
			label: 'Switch a runtime',
			command: 'omg use node 24',
			title: 'The runtime your project needs.',
			description: 'Install and select Node.js 24 through the same command-line interface.',
			parts: ['Node.js 24', 'Runtime manager', 'Project selection'],
			note: 'Runtime availability and integrity checks depend on the provider.'
		},
		{
			label: 'Run a task',
			command: 'omg run test',
			title: 'Use the task your project already defines.',
			description:
				'Discover and run a project task without switching to another command-line tool.',
			parts: ['Project scripts', 'Task discovery', 'Test command'],
			note: 'The task and its result depend on the current project configuration.'
		}
	] as const;
	const workflows = [
		{
			label: 'Inspect',
			title: 'Start with the repository.',
			description:
				'Manifests, lockfiles, runtime versions, and existing scripts inform the plan. Ambiguous evidence needs a human decision.',
			file: 'Repository evidence',
			lines: [
				'package.json → scripts and dependencies',
				'package-lock.json → install strategy',
				'.nvmrc → runtime version',
				'.github/workflows/ → existing automation'
			]
		},
		{
			label: 'Preview',
			title: 'Review what will change.',
			description:
				'Inspect the proposed workflow and pipeline description, including credentials that still need configuration.',
			file: 'Proposed files',
			lines: [
				'.github/workflows/deploylint.yml',
				'.deploylint/pipeline.yml',
				'',
				'Workflow permissions: contents: read'
			]
		},
		{
			label: 'Pull request',
			title: 'You make the call.',
			description:
				'The GitHub App opens an isolated setup pull request. The generated workflow is there to review before you merge.',
			file: 'Setup pull request',
			lines: [
				'Base branch ← setup branch',
				'Review the proposed workflow',
				'Configure required credentials',
				'Merge after human review'
			]
		}
	] as const;
	const metrics = [
		{
			label: 'Total tokens',
			value: '12.60',
			unit: 'B',
			detail: 'Recorded tokens, including cached context.',
			note: 'Cached tokens are reused context. This is not a count of newly written code.'
		},
		{
			label: 'Requests',
			value: '93,359',
			unit: '',
			detail: 'Recorded usage events across the snapshot.',
			note: 'Requests are usage events, not unique projects, sessions, or completed tasks.'
		},
		{
			label: 'Output tokens',
			value: '28.20',
			unit: 'M',
			detail: 'Tokens generated as output.',
			note: 'Output volume describes activity. It is not a measure of software quality.'
		}
	] as const;
	const command = $derived(commands[commandIndex] ?? commands[0]);
	const workflow = $derived(workflows[workflowIndex] ?? workflows[0]);
	const metric = $derived(metrics[metricIndex] ?? metrics[0]);
	function selectProject(index: number) {
		active = index;
		updateScene?.(index);
	}
	function navigateProjects(event: KeyboardEvent) {
		let next: number;
		if (event.key === 'ArrowRight') next = (active + 1) % projects.length;
		else if (event.key === 'ArrowLeft') next = (active + projects.length - 1) % projects.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = projects.length - 1;
		else return;
		event.preventDefault();
		selectProject(next);
		projectList.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
	}
	function selectCommand(index: number) {
		commandIndex = index;
		copied = false;
		copyFailed = false;
		clearTimeout(copyTimer);
	}
	async function copyCommand() {
		try {
			await navigator.clipboard.writeText(command.command);
			copied = true;
			copyFailed = false;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			copyFailed = true;
		}
	}
	onMount(() => {
		let disposed = false;
		let cleanup: (() => void) | undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				observer.disconnect();
				const url = new URL('/orbit/scene.js', window.location.href).href;
				void import(/* @vite-ignore */ url)
					.then(
						(module: {
							mountObservatory: (
								canvas: HTMLCanvasElement,
								project: number
							) => { select: (project: number) => void; dispose: () => void };
						}) => {
							if (disposed) return;
							const scene = module.mountObservatory(canvas, active);
							updateScene = scene.select;
							cleanup = scene.dispose;
						}
					)
					.catch(() => {
						/* Content and CSS lighting remain available without WebGL. */
					});
			},
			{ rootMargin: '120px' }
		);
		observer.observe(canvas);
		return () => {
			disposed = true;
			observer.disconnect();
			clearTimeout(copyTimer);
			cleanup?.();
			updateScene = undefined;
		};
	});
</script>

<section
	id="work"
	class="observatory"
	data-project={(projects[active] ?? projects[0]).id}
	aria-labelledby="work-heading"
>
	<header class="observatory-heading">
		<h2 id="work-heading">The work,<br /><span>up close.</span></h2>
		<p>Tools I wanted to exist.<br />Now you can look inside.</p>
	</header>
	<noscript>
		<p class="observatory-no-script">
			You can also explore <a href={resolve('/work/deploylint')}>DeployLint</a> and
			<a href={TOKEN_CONTROL_URL} target="_blank" rel="external noopener">Token Control</a> directly.
		</p>
	</noscript>
	<div class="observatory-stage">
		<div class="observatory-sky" aria-hidden="true"><canvas bind:this={canvas}></canvas></div>
		<div
			class="project-selector"
			role="tablist"
			tabindex="-1"
			aria-label="Explore a project"
			bind:this={projectList}
			onkeydown={navigateProjects}
		>
			{#each projects as project, index (project.id)}
				<button
					role="tab"
					id={`select-${project.id}`}
					aria-controls={`project-${project.id}`}
					aria-selected={active === index}
					tabindex={active === index ? 0 : -1}
					onclick={() => selectProject(index)}
				>
					<project.icon size={22} weight={active === index ? 'fill' : 'regular'} />
					<span><strong>{project.name}</strong><small>{project.type}</small></span>
					<span class="project-selected-mark" aria-hidden="true"><ArrowRightIcon size={18} /></span>
				</button>
			{/each}
		</div>
		<div
			id="project-omg"
			class="observatory-panel"
			role="tabpanel"
			aria-labelledby="select-omg"
			tabindex="0"
			hidden={active !== 0}
		>
			<div class="observatory-story">
				<h3>Your toolchain.<br />One command.</h3>
				<p>
					I got tired of juggling tools just to get a project running. So I built a Rust CLI for
					packages, runtimes, and project tasks.
				</p>
				<p class="project-materials">
					Rust <span>/</span> Linux & macOS <span>/</span> Public alpha
				</p>
				<a
					class="observatory-primary-link"
					href={OMG_PROJECT.demoUrl}
					target="_blank"
					rel="external noopener"
					onclick={() => telemetry?.recordPortfolioAction('omg_site_open')}
					>Open OMG <ArrowUpRightIcon size={19} /></a
				>
				<div class="observatory-evidence">
					<a
						href={resolve('/work/omg')}
						onclick={() => telemetry?.recordPortfolioAction('featured_omg_open')}
						>How I built it <ArrowUpRightIcon size={14} /></a
					><a href={OMG_PROJECT.repoUrl} target="_blank" rel="external noopener"
						><GithubLogoIcon size={16} /> Source</a
					>
				</div>
			</div>
			<div class="project-experience command-experience">
				<div class="experience-topline">
					<span><TerminalIcon size={16} /> OMG command explorer</span><small
						>Interactive walkthrough</small
					>
				</div>
				<div class="command-options" aria-label="Explore OMG commands">
					{#each commands as option, index (option.label)}<button
							aria-pressed={commandIndex === index}
							onclick={() => selectCommand(index)}>{option.label}</button
						>{/each}
				</div>
				<div class="command-display" aria-live="polite">
					<span class="shell-prompt" aria-hidden="true">$</span><code>{command.command}</code>
					<button
						class="copy-command"
						aria-label={copied ? 'Command copied' : 'Copy command'}
						onclick={copyCommand}
						>{#if copied}<CheckIcon size={18} />{:else}<CopyIcon size={18} />{/if}</button
					>
				</div>
				<div class="command-explanation" aria-live="polite">
					<h4>{command.title}</h4>
					<p>{command.description}</p>
					<ol class="command-path">
						{#each command.parts as part, index (part)}<li>
								<span>{part}</span>{#if index < 2}<ArrowRightIcon
										size={17}
										aria-hidden="true"
									/>{/if}
							</li>{/each}
					</ol>
					<p class="experience-note">
						{copyFailed
							? 'Clipboard unavailable. Select the command above to copy it.'
							: command.note}
					</p>
				</div>
				<div class="experience-bottomline">
					<span>Documented commands</span><span>Preview · nothing runs in your browser</span>
				</div>
			</div>
		</div>
		<div
			id="project-deploylint"
			class="observatory-panel"
			role="tabpanel"
			aria-labelledby="select-deploylint"
			tabindex="0"
			hidden={active !== 1}
		>
			<div class="observatory-story">
				<h3>A pipeline.<br />With a paper trail.</h3>
				<p>
					CI setup should start with your repository. DeployLint inspects the project, proposes a
					workflow, and opens a pull request you can review.
				</p>
				<p class="project-materials">
					SvelteKit <span>/</span> GitHub Apps <span>/</span> Cloudflare
				</p>
				<a
					class="observatory-primary-link"
					href={DEPLOYLINT_PROJECT.demoUrl}
					target="_blank"
					rel="external noopener"
					onclick={() => telemetry?.recordPortfolioAction('deploylint_site_open')}
					>Open DeployLint <ArrowUpRightIcon size={19} /></a
				>
				<div class="observatory-evidence">
					<a
						href={resolve('/work/deploylint')}
						onclick={() => telemetry?.recordPortfolioAction('featured_deploylint_open')}
						>How I built it <ArrowUpRightIcon size={14} /></a
					>
				</div>
			</div>
			<div class="project-experience pipeline-experience">
				<div class="experience-topline">
					<span><GitPullRequestIcon size={16} /> Repository to review</span><small
						>Workflow walkthrough</small
					>
				</div>
				<div class="workflow-options" aria-label="Explore the DeployLint workflow">
					{#each workflows as step, index (step.label)}<button
							aria-pressed={workflowIndex === index}
							onclick={() => (workflowIndex = index)}
							><span class="workflow-node">{index + 1}</span>{step.label}</button
						>{/each}
				</div>
				<div class="workflow-detail" aria-live="polite">
					<h4>{workflow.title}</h4>
					<p>{workflow.description}</p>
					<div class="workflow-files">
						<span>{workflow.file}</span>{#each workflow.lines as line (line)}<code
								>{line || '\u00a0'}</code
							>{/each}
					</div>
				</div>
				<div class="experience-bottomline">
					<span>Illustrative repository</span><span>Human review before merge</span>
				</div>
			</div>
		</div>
		<div
			id="project-tokens"
			class="observatory-panel"
			role="tabpanel"
			aria-labelledby="select-tokens"
			tabindex="0"
			hidden={active !== 2}
		>
			<div class="observatory-story">
				<h3>Where did all<br />the tokens go?</h3>
				<p>
					I wanted to understand my AI-assisted coding activity. Token Control brings the token
					volume, model mix, cache use, and estimated spend into view.
				</p>
				<p class="project-materials">Personal project <span>/</span> Usage telemetry</p>
				<a
					class="observatory-primary-link"
					href={TOKEN_CONTROL_URL}
					target="_blank"
					rel="external noopener">Open Token Control <ArrowUpRightIcon size={19} /></a
				>
				<p class="observatory-smallprint">
					The live dashboard carries the current totals. This preview uses a fixed, recorded
					snapshot.
				</p>
			</div>
			<div class="project-experience telemetry-experience">
				<div class="experience-topline">
					<span><ChartBarIcon size={16} /> Codex usage snapshot</span><small
						>Sep 3 – Oct 2, 2026</small
					>
				</div>
				<div class="metric-options" aria-label="Explore recorded usage">
					{#each metrics as option, index (option.label)}<button
							aria-pressed={metricIndex === index}
							onclick={() => (metricIndex = index)}>{option.label}</button
						>{/each}
				</div>
				<div class="metric-reading" aria-live="polite">
					<strong>{metric.value}<span>{metric.unit}</span></strong>
					<p>{metric.detail}</p>
					<div class="telemetry-scale" aria-hidden="true">
						{#each Array.from({ length: 41 }, (_, i) => i) as tick (tick)}<i
								class:major={tick % 5 === 0}
							></i>{/each}
					</div>
					<p class="experience-note">{metric.note}</p>
				</div>
				<div class="experience-bottomline">
					<span>30-day recording</span><span>Fixed snapshot · not lifetime usage</span>
				</div>
			</div>
		</div>
		<footer class="observatory-footnote">
			<span>Three projects. Still building.</span><span
				>Select a project. Explore what it does.</span
			>
		</footer>
	</div>
</section>
