import { Effect } from 'effect';
import { SvelteMap } from 'svelte/reactivity';
import type { Attachment } from 'svelte/attachments';
import type { DashboardWorkspace, RepositoryFilter } from '$lib/domain/dashboard-workspace';

/** Rune-backed interaction state for the GitHub intelligence desk. */
export class DashboardView {
	#activeWorkspace = $state<DashboardWorkspace>('today');
	#selectedRepository = $state<string | null>(null);
	#repositoryFilter = $state<RepositoryFilter>('active');
	#repositoryQuery = $state('');
	#commandOpen = $state(false);
	#isRefreshing = $state(false);
	#hoveredRepository = $state<string | null>(null);
	#workspaceNodes = new SvelteMap<DashboardWorkspace, HTMLElement>();

	/** Currently visible analytical workspace. */
	get activeWorkspace(): DashboardWorkspace {
		return this.#activeWorkspace;
	}

	/** Selected repository full name. */
	get selectedRepository(): string | null {
		return this.#selectedRepository;
	}

	/** Active repository visibility filter. */
	get repositoryFilter(): RepositoryFilter {
		return this.#repositoryFilter;
	}

	/** Current repository search query. */
	get repositoryQuery(): string {
		return this.#repositoryQuery;
	}

	/** Whether the command palette is open. */
	get commandOpen(): boolean {
		return this.#commandOpen;
	}

	/** Whether a refresh is currently in flight. */
	get isRefreshing(): boolean {
		return this.#isRefreshing;
	}

	/** Repository currently under the pointer. */
	get hoveredRepository(): string | null {
		return this.#hoveredRepository;
	}

	/** Move to one analytical workspace. */
	navigate(workspace: DashboardWorkspace): void {
		this.#activeWorkspace = workspace;
		this.#commandOpen = false;
		requestAnimationFrame(() => {
			this.#workspaceNodes.get(workspace)?.focus({ preventScroll: true });
		});
	}

	/** Choose one repository for detailed inspection. */
	selectRepository(fullName: string): void {
		this.#selectedRepository = fullName;
	}

	/** Set the repository explorer filter. */
	setRepositoryFilter(filter: RepositoryFilter): void {
		this.#repositoryFilter = filter;
	}

	/** Set the repository explorer query. */
	setRepositoryQuery(query: string): void {
		this.#repositoryQuery = query;
	}

	/** Set the repository currently under the pointer. */
	hoverRepository(fullName: string | null): void {
		this.#hoveredRepository = fullName;
	}

	/** Toggle the command palette. */
	toggleCommand(): void {
		this.#commandOpen = !this.#commandOpen;
	}

	/** Close the command palette. */
	closeCommand(): void {
		this.#commandOpen = false;
	}

	/** Run one refresh operation and always restore the interactive state. */
	refresh(operation: () => Promise<void>): void {
		if (this.#isRefreshing) return;
		this.#isRefreshing = true;
		Effect.runFork(
			Effect.tryPromise({
				try: operation,
				catch: (cause) => cause
			}).pipe(Effect.ensuring(Effect.sync(() => (this.#isRefreshing = false))))
		);
	}

	/** Attach application-level keyboard shortcuts and workspace node tracking. */
	readonly attachApplication: Attachment<HTMLElement> = () => {
		const onKeyDown = (event: KeyboardEvent): void => {
			const target = event.target;
			const isTyping =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement;
			if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
				event.preventDefault();
				this.toggleCommand();
				return;
			}
			if (event.key === 'Escape') {
				this.closeCommand();
				return;
			}
			if (isTyping) return;
			const shortcuts: Readonly<Record<string, DashboardWorkspace>> = {
				'1': 'today',
				'2': 'brief',
				'3': 'delivery',
				'4': 'craft',
				'5': 'repositories',
				'6': 'activity',
				'7': 'cloudflare',
				'8': 'career'
			};
			const workspace = shortcuts[event.key];
			if (workspace !== undefined) this.navigate(workspace);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	};

	/** Attach one workspace page for focus restoration. */
	workspaceAttachment(workspace: DashboardWorkspace): Attachment<HTMLElement> {
		return (node) => {
			this.#workspaceNodes.set(workspace, node);
			return () => this.#workspaceNodes.delete(workspace);
		};
	}
}
