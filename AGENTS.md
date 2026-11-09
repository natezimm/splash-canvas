# AGENTS.md — SplashCanvas Coding Agent & Architecture Guide

## Project Overview
**SplashCanvas** is a zero-dependency, 100% client-side non-photorealistic rendering (NPR) studio that transforms photographs into bespoke watercolor portraits, pet illustrations, and architectural line-and-wash artwork.

- **Repository**: `https://github.com/natezimm/splash-canvas`
- **Local Path**: `/Users/nathan/Coding/splash-canvas`
- **Tech Stack**: Semantic HTML5, CSS3 Custom Properties, Vanilla ES6+ JavaScript, HTML5 2D Canvas (`ImageData`, 64-bit Summed-Area Tables, 2D Gradient Perlin fBm Noise), and optional CDN-loaded `@mediapipe/selfie_segmentation`.
- **Execution Model**: Static client-only web app—runs directly via `index.html` or any static HTTP host (GitHub Pages) with zero build steps.

---

## Architecture & Module Boundaries

| File | Role & Architectural Boundaries |
| :--- | :--- |
| `engine.js` | **Pure Rendering Engine** (`SeededRandom`, `PerlinNoise2D`, `WatercolorEngine`). Strictly decoupled from application DOM selectors; accepts an `HTMLImageElement`/`HTMLCanvasElement` in `loadImage()`, a target `<canvas>` and `@typedef {WatercolorParams}` object in `render()`, and returns frame execution telemetry in milliseconds. |
| `app.js` | **Studio Controller & State Management** (`SAMPLE_CATALOG`, `PRESETS`, `HistoryManager`, `SplashCanvasApp`). Owns DOM event delegation, `requestAnimationFrame` render scheduling, 25-step Undo/Redo state snapshots, Standard vs. Advanced View modes, 1-Click Smart Enhance auto-calibration, custom preset library with `localStorage` persistence, clipboard image pasting (`Cmd/Ctrl+V`), pointer-drag stage pan at `zoom > 1.0`, Virtual Gallery Framing controller, Print Studio modal with 300 DPI sizing readouts, direct PNG clipboard copy, procedural offscreen frame compositing, and CORS-safe Unsplash image loading with offline procedural fallback. |
| `index.html` | **Application Shell & Accessibility Markup**. Defines the top studio bar, 3-column workspace grid (`.left-panel`, `.canvas-stage`, `.right-panel`), gallery frame selector (`#frame-select`), 25 data-bound range inputs (15 essential controls in Standard View, 25 in Advanced View), keyboard shortcuts modal, custom preset modal, Print Studio export modal (`#export-modal`), and ARIA live toast container. |
| `styles.css` | **Studio Design System**. Dark room color tokens (`#0b0d13` / `#12151e` / `#181c28`), dynamic range slider fill tracks (`--fill-pct`), Standard/Advanced slider hiding (`.mode-standard .control-row.advanced`), non-clipping block scroll containers (`.sliders-scroll`, `.left-panel`), split-curtain comparison overlay, stage pan grab/grabbing cursor states, CSS gallery framing system (`.frame-oak`, `.frame-black`, `.frame-white`), Print Studio modal layout, and toast animations. |
| `README.md` | **Technical Specification & User Guide**. Documents the 3-stage rendering pipeline, $O(1)$ integral image math, UX features, and keyboard shortcuts. |

---

## Core Rendering Pipeline (`engine.js`)

When modifying or extending watercolor effects, preserve the three-stage caching architecture inside `WatercolorEngine`:

1. **Stage 1 — Image Precomputation (`loadImage`)**:
   - `_buildIntegralTables()`: Precomputes five `Float64Array` Summed-Area Tables (`sumR`, `sumG`, `sumB`, `sumL`, `sumL2`) over the source image once per photo load.
   - `_computeEdgeField()`: Computes a $3\times 3$ Sobel gradient magnitude map (`this.edgeField`) for facial/central detail retention and ink linework.
   - `_computeSmartSubjectMask()`: Samples border background clusters and fuses chromatic distance, local edge density, saturation, and an elliptical portrait prior (`this.autoSubjectMask`).
   - `_buildPaperAndCloudFields()`: Synthesizes multi-octave 2D Perlin fBm fields (`this.paperField` and `this.cloudField`).
2. **Stage 2 — Cached Base Pigment Layer (`_ensurePaintedLayer`)**:
   - Evaluates the 4-quadrant anisotropic Kuwahara filter and wet-wash smoothing in **$O(1)$ time per pixel** using `this.integralTables`.
   - Applies central/edge detail fidelity blending, soft palette quantization, and perceptual color grading.
   - Memoized via `this.lastPaintSignature` (`this.lastCacheHit = true` when unchanged) so adjusting any mask, bleed, splatter, sketch, or paper slider skips Stage 2 completely.
3. **Stage 3 — Wash Mask, Chromatic Bleed & Vector Splatter Compositor (`render`)**:
   - `_buildWatercolorMask(params)` combines `autoSubjectMask` (or `aiSubjectMask`), `userBrushMask`, 4-octave fBm boundary noise (`edgeRoughness`), and Hermite smoothstep feathering (`edgeSoftness`).
   - `_createColorBleedBuffer(bleedRadius)` runs a separable $O(1)$ sliding-window RGB blur so washes and splatters outside the tight silhouette carry accurate local subject colors.
   - Per-pixel compositor applies cold-press paper tooth, atmospheric outer clouds, dry-brush paper gaps, valley granulation, sinusoidal wet water-ring edge darkening, and Sobel graphite/sepia ink contours.
   - `_renderSplattersAndDrips()` estimates outward boundary normals from `baseMask` to project color-matched radial blooms, directional elliptical droplets, and vertical gravity drips.

---

## Invariants & Guidelines for Coding Agents

### 1. Adding a New Effect Parameter
To add a new real-time slider without breaking preset switching, Undo/Redo, or group resets:
1. **`index.html`**: Add a `.control-row` with `data-label="<search keywords>"` inside the appropriate `<details class="control-group" data-group="<groupName>">`:
   - `<input type="range" id="Ctrl-<paramName>" data-param="<paramName>" data-group="<groupName>" ... />`
   - `<span class="val" id="val-<paramName>">...</span>`
2. **`app.js`**:
   - Add `<paramName>` with a calibrated default to **all 8 preset objects** in `PRESETS`.
   - Update `_updateSliderLabel(param, value)` if the display unit differs from `%`.
3. **`engine.js`**:
   - Document the parameter on `@typedef {Object} WatercolorParams`.
   - If the parameter modifies Stage-2 base pigment abstraction or color grading, append `params.<paramName>` to `sig` in `_ensurePaintedLayer(params)`.
   - Otherwise, consume `params.<paramName>` in Stage 3 (`render()`, `_buildWatercolorMask()`, or `_renderSplattersAndDrips()`).

### 2. Layout & CSS Guardrails
- **Never** set `display: flex; flex-direction: column` directly on `.sliders-scroll` or `.left-panel` without `flex-shrink: 0` on children, and **never** apply `overflow: hidden` to `.control-group`—doing so squashes `<details>` accordions when all 6 categories are open simultaneously. Keep `.sliders-scroll { display: block; overflow-y: auto; }`.
- Always call `this._updateRangeFillProgress(input)` when programmatically updating range input values so the `--fill-pct` active track gradient stays synchronized.

### 3. CORS & Offline Resilience
- All remote sample images in `SAMPLE_CATALOG` must use `img.crossOrigin = "anonymous"` from a CORS-enabled host (`images.unsplash.com`) and maintain a timeout/error fallback to `_loadProceduralFallback()` so `ctx.getImageData()` never throws a `SecurityError` and the app works offline.
