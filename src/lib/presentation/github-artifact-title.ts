const DEVELOPMENT_BUILD_PATTERN = /^(Development build)\s+([a-f\d]{8,})$/i;

/** Shorten machine-generated development-build titles while retaining a stable identifier. */
export function formatGitHubArtifactTitle(title: string): string {
	const match = DEVELOPMENT_BUILD_PATTERN.exec(title.trim());
	return match === null ? title : `${match[1]} ${(match[2] ?? '').slice(0, 7)}`;
}
