# Cinematic arrival

Visitors should experience the portfolio's cinematic character without needing to find the film button. The automatic sequence therefore belongs to the existing hero scene. It does not hide content, block links, move keyboard focus, lock scrolling, or open a full-screen overlay. The existing film remains available as “Replay the full opening.”

## Motion choices

- A first visit gets a 7.2-second Starbase ignition, ascent, booster separation, and orbital arrival; a returning visit gets a 1.6-second orbital settling sequence at 35% amplitude, without another ignition. These timings are editorial choices, not research-derived conversion claims.
- The camera starts and ends at the resting homepage pose. The same geometry, textures, lighting and renderer are reused. No second scene or video loads for the arrival.
- The sequence starts when at least 20% of the globe's visual viewport is visible. This prevents the phone sequence from finishing above the fold before the globe can be seen.
- Scrolling more than 96px after the sequence starts settles it over 450ms. Moving the globe offscreen finishes it. These thresholds are design choices to preserve scrolling rather than intercept it.
- A saved pause preference, reduced-motion setting, or full-film replay finishes the automatic sequence. Availability changes do not restart it.
- Visit memory is optional local storage. Storage refusal leaves a usable page and falls back to the first-visit duration.

## Source-backed constraints

1. [W3C: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide): ongoing automatic motion presented alongside content needs a stop/pause mechanism. The existing motion control governs the arrival and resting scene.
2. [W3C: prefers-reduced-motion technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39): respect the operating system's motion preference. The controller and arrival both check reduced motion, including changes during playback.
3. [Three.js: Responsive Design](https://threejs.org/manual/pages/responsive.html): render dimensions and camera aspect must track the display viewport, with attention to GPU cost at high device pixel ratios. The arrival retains the hero's existing viewport measurements and bounded pixel ratio.
4. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame): animation should use elapsed time rather than frame counts. The arrival advances using the controller's delta time and does not advance while its viewport is unavailable.

These sources support implementation constraints. The trajectory, amplitude, duration and placement are design judgments that require visual testing; they are not guarantees about engagement or device performance.

## Verification

Check first and returning visits, scrolling during arrival, content links and keyboard focus during playback, delayed scene loading after scrolling past the hero, pause/resume, dynamic reduced motion, storage denial, narrow phone layouts, viewport resizing, WebGL failure, and full-film replay. Inspect rendered frames at the start, middle and resting endpoint. Keep physical iPhone GPU behavior distinct from Windows WebKit layout verification.

## Starbase scene

The spacecraft is original procedural geometry inspired by Starship, with separately animated ship and booster, instanced metal bands and engine details, a dark heat-shield half-shell, and a bounded transparent exhaust shader. No Sketchfab asset is downloaded or bundled. The old Voyager GLB is no longer requested. This is a stylized cinematic, not a flight simulation or an official SpaceX model.

[SpaceX identifies Starbase, Texas as the site of Starship development and launches](https://www.spacex.com/launches/ispac). The launch origin uses approximate Starbase coordinates (26 degrees north, 97 degrees west) transformed with the same spherical UV convention and initial rotation as Earth. The globe turns from the Americas toward its resting orientation as the ship rises. Camera composition, apparent scale, seven-second duration, and trajectory are editorial choices.

[Three.js InstancedMesh](https://threejs.org/docs/#InstancedMesh) supports repeated geometry with fewer draw calls. Rings and engine bells use instancing; the model has a tested budget of at most 12 mesh draws and 15,000 triangles including instance counts. Geometry, materials, and instance buffers join the existing disposal registry. The shared scene and renderer remain the only homepage rendering pipeline.

The versioned visit key lets previous visitors see the new launch once. Reduced motion, saved pause, scrolling, hidden/offscreen state, and delayed loading still use the arrival controller. Returning visitors see the ship already in orbit. Full opening replay uses the same launch choreography at a slower pace.
