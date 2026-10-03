# Cinematic arrival

Visitors should experience the portfolio's cinematic character without needing to find the film button. The automatic sequence therefore belongs to the existing hero scene. It does not hide content, block links, move keyboard focus, lock scrolling, or open a full-screen overlay. The existing film remains available as “Replay the full opening.”

## Motion choices

- A first visit gets a 4.8-second camera and Voyager fly-by; a returning visit gets a 1.6-second sequence at 35% amplitude. These timings are editorial choices, not research-derived conversion claims.
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
