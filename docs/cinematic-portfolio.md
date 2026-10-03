# Olen / In Orbit

The public portfolio presents Olen's real software projects through a cinematic Earth scene. Keep the homepage, About and both case study URLs prerendered and immediately readable. The opening film plays only when the visitor chooses Watch the opening, with an explicit skip. Loading, refreshing and route changes never start the film. Retain the protected owner workspace, project evidence and contact telemetry.

Palette: midnight #040710, deep space #0c1224, starlight #eff4ff, ice #9ae7ff, ion #aca2ff. D-DIN carries film titles and major headings; Geist carries prose and controls. The homepage is wide and cinematic; supporting pages use an editorial reading grid with the same navigation and tokens.

Three.js and GSAP are built into a separate static module; the Svelte component loads it after initial content has rendered and disposes the scene on navigation. Responsive Earth posters are captured from the actual scene with motion paused, keeping the loading view consistent with the rendered desktop, tablet and phone composition. Reserve the scene controls' height while loading and start the camera in its resting position. Do not move meaningful content into canvas. Assets remain local, with NASA and Solar System Scope provenance retained. Motion respects user preference and pauses in the background.

Acceptance: desktop and phone visual inspection, full opening and skip/replay/pause, repeated Svelte navigation without duplicate render loops, reduced motion and WebGL fallback, prerendered headings/project links/schema, and all existing quality/deploy gates.

The movie initializes immediately; decorative canvases wait until visible. Request the default GPU preference without multisampling the canvas; the movie's composer supplies its own multisampled render target. Every renderer must explicitly release its WebGL context after disposing resources. Retrying the opening replaces its canvas and reuses the loaded module. Verify repeated home/About navigation under a three-context limit: the live context count must return to zero on About and the original opening must remain playable on each return.
