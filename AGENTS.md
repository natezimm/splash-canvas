# AGENTS.md — SplashCanvas Coding Agent Guide

## Project Overview
**SplashCanvas** is a zero-dependency, 100% client-side web application that transforms photos into bespoke watercolor portraits and illustrations (inspired by custom portrait watercolor artwork with subject isolation, color-matched outward splatters, pigment granulation, wet water-ring edge darkening, ink/pencil linework, and cold-press cotton paper textures).

- **Repository**: `https://github.com/natezimm/splash-canvas`
- **Local Path**: `/Users/nathan/Coding/splash-canvas`
- **Tech Stack**: Vanilla HTML5, CSS3, ES6+ JavaScript, HTML5 2D Canvas (`ImageData` + Summed-Area Table integral histograms + 2D Fractional Brownian Motion Perlin Noise), and optional CDN-loaded `@mediapipe/selfie_segmentation`.
- **Runtime**: Static files—runs directly by opening `index.html` or serving the root folder via any static HTTP server or GitHub Pages.

## Architecture & File Map

| File | Responsibility |
| :--- | :--- |
| `index.html` | Application shell, top toolbar, left sidebar (8 presets, cutout modes, interactive mask brush, paper stock swatches), center canvas viewport (4 view modes + split comparison slider + drag-and-drop overlay), and right sidebar (24 real-time effect sliders in 6 collapsible `<details>` groups). |
| `styles.css` | Dark studio UI theme (`#0f1117` / `#171a23`), 3-column CSS Grid layout (`.workspace`), custom range inputs, split-slider overlay, and scrollable sidebars. |
| `engine.js` | Pure image-processing pipeline (`SeededRandom`, `PerlinNoise2D`, `WatercolorEngine`). Contains zero DOM selector dependencies beyond the target `<canvas>` passed into `render()`. |
| `app.js` | UI controller (`SplashCanvasApp`) and preset catalog (`PRESETS`). Manages state synchronization between DOM controls and `WatercolorEngine`, pointer events for mask brushing and split-screen comparison, procedural sample scene synthesis, MediaPipe AI cutout fallback, and 1x/1.5x/2x PNG export. |
| `README.md` | User-facing documentation, feature matrix, local run instructions, and GitHub Pages deployment steps. |

## Core Rendering Pipeline (`engine.js`)
When modifying or extending watercolor effects, preserve the two-stage caching architecture in `WatercolorEngine`:

1. **Precomputed Image Fields (`loadImage`)**:
   - `_computeEdgeField()`: Sobel gradient magnitude map (`this.edgeField`) used for face/subject fidelity retention and pencil/ink sketch outlines.
   - `_computeSmartSubjectMask()`: Border-sampled background color distance + radial center prior + local edge density (`this.autoSubjectMask`).
   - `_buildPaperAndCloudFields()`: Multi-octave 2D Perlin fBm fields (`this.paperField` and `this.cloudField`).
2. **Cached Base Paint Layer (`_ensurePaintedLayer`)**:
   - Uses **Summed-Area Tables (integral images)** (`sumR`, `sumG`, `sumB`, `sumL`, `sumL2`) so Kuwahara anisotropic brush abstraction and wet-wash box smoothing run in $O(1)$ per pixel regardless of `brushRadius`.
   - Recomputes `this.paintedRGB` **only** when brush/color-grading parameters (`brushRadius`, `wetSmoothness`, `detailFidelity`, `colorSimplification`, `vibrancy`, `luminosity`, `contrast`, `warmth`) change.
3. **Real-Time Mask, Bleed & Splatter Compositing (`render`)**:
   - `_buildWatercolorMask(params)` combines `autoSubjectMask` (or `aiSubjectMask`), `userBrushMask`, Perlin edge perturbation (`edgeRoughness`), and smoothstep feathering (`edgeSoftness`).
   - `_createColorBleedBuffer(bleedRadius)` creates the outward pigment bleed aura.
   - Per-pixel pass applies paper tooth grain, outer atmospheric clouds, dry-brush paper gaps, pigment granulation, wet water-ring edge darkening (sine bell curve along mask boundary), and sepia/graphite ink outlines.
   - `_renderSplattersAndDrips()` samples boundary normals and local subject colors to draw radial-gradient watercolor blooms, directional elliptical droplets, and gravity drips.

## Guidelines for Coding Agents

### 1. Adding a New Effect Slider
To add a new real-time slider without breaking presets or UI layout:
1. **`index.html`**: Add a `.control-row` inside the appropriate `<details class="control-group">` in `.sliders-scroll`:
   - Use `id="Ctrl-<paramName>"` and `data-param="<paramName>"` on the `<input type="range">`.
   - Use `id="val-<paramName>"` on the `<span class="val">` badge.
2. **`app.js`**:
   - Add `<paramName>` with a sensible default to **all 8 objects** in `PRESETS`.
   - Update `_updateSliderLabel(param, value)` if the unit is not `%` (e.g., `px`).
3. **`engine.js`**:
   - If the parameter affects base pigment abstraction or color grading, include `params.<paramName>` in the signature array inside `_ensurePaintedLayer(params)`.
   - Otherwise, consume `params.<paramName>` directly in `render()`, `_buildWatercolorMask()`, or `_renderSplattersAndDrips()`.

### 2. UI & CSS Guardrails
- **Never** set `display: flex; flex-direction: column` directly on `.sliders-scroll` or `.left-panel` without `flex-shrink: 0` on children, and **never** put `overflow: hidden` on `.control-group`—doing so will squash `<details>` groups when all 6 categories are open simultaneously. Keep `.sliders-scroll { display: block; overflow-y: auto; }`.
- Maintain `requestAnimationFrame` throttling via `this.scheduleRender()` in `SplashCanvasApp` so dragging sliders remains 60fps.

### 3. Zero-Build & Offline First
- Do not introduce npm build steps, bundlers, or external runtime dependencies that break opening `index.html` directly via `file://` or static GitHub Pages hosting.
- Any external CDN enhancement (such as `@mediapipe/selfie_segmentation`) must degrade gracefully to local algorithms when offline or blocked by CORS.
