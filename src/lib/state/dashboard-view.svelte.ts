import { SvelteMap } from 'svelte/reactivity';
import type { Attachment } from 'svelte/attachments';
import type { DashboardWorkspace } from '$lib/domain/dashboard-workspace';

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/** Rune-backed interaction state for one audience's workspace desk. */
export class DashboardView {
	#activeWorkspace = $state<DashboardWorkspace>('today');
	#selectedRepository = $state<string | null>(null);
	#commandOpen = $state(false);
	#isRefreshing = $state(false);
	#refreshError = $state<string | null>(null);
	#shortcuts: Readonly<Partial<Record<string, DashboardWorkspace>>>;
	#workspaceNodes = new SvelteMap<DashboardWorkspace, HTMLElement>();

	constructor(options: {
		readonly initialWorkspace: DashboardWorkspace;
		readonly shortcuts: Readonly<Partial<Record<string, DashboardWorkspace>>>;
	}) {
		this.#activeWorkspace = options.initialWorkspace;
		this.#shortcuts = options.shortcuts;
	}

	/** Currently visible analytical workspace. */
	get activeWorkspace(): DashboardWorkspace {
		return this.#activeWorkspace;
	}

	/** Selected repository full name. */
	get selectedRepository(): string | null {
		return this.#selectedRepository;
	}

	/** Whether the command palette is open. */
	get commandOpen(): boolean {
		return this.#commandOpen;
	}

	/** Whether a refresh is currently in flight. */
	get isRefreshing(): boolean {
		return this.#isRefreshing;
	}

	/** Safe refresh failure summary for the current interaction. */
	get refreshError(): string | null {
		return this.#refreshError;
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

	/** Toggle the command palette. */
	toggleCommand(): void {
		this.#commandOpen = !this.#commandOpen;
	}

	/** Close the command palette. */
	closeCommand(): void {
		this.#commandOpen = false;
	}

	/** Run one refresh operation and expose a bounded failure state. */
	refresh(operation: () => Promise<void>): void {
		if (this.#isRefreshing) return;
		this.#isRefreshing = true;
		this.#refreshError = null;
		void operation().then(
			() => {
				this.#isRefreshing = false;
			},
			(cause: unknown) => {
				console.warn('Dashboard refresh failed:', errorMessage(cause));
				this.#isRefreshing = false;
				this.#refreshError = 'Refresh failed. The previous evidence remains available.';
			}
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
			const workspace = this.#shortcuts[event.key];
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
