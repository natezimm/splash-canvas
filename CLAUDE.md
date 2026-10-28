# CLAUDE.md — SplashCanvas Developer & AI Assistant Guide

## Project Summary
**SplashCanvas** is a client-side non-photorealistic watercolor studio located in `/Users/nathan/Coding/splash-canvas` (GitHub: `https://github.com/natezimm/splash-canvas`). It replicates bespoke portrait, pet, and architectural watercolor paintings—complete with smart saliency cutout, outward color-matched splatters, wet water-ring edge pooling, vertical gravity drips, Sobel ink linework, and cold-press paper texture—entirely in the browser using HTML5 2D Canvas.

## Quick Commands
SplashCanvas is a zero-build static web application:

```bash
# Open directly in macOS default browser
open index.html

# Or serve locally (recommended for full MediaPipe WASM support)
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## Codebase Structure
- `index.html` — Studio UI shell: top action & history bar, left preset & mask brush sidebar, center interactive viewport (*Artwork*, *Split Compare*, *Original*, *Alpha Mask*, *Hold Original*, *Seed Pill*), and right 24-slider parameter panel with live search filter and per-group reset buttons.
- `styles.css` — Dark studio design tokens, 3-column CSS Grid (`.workspace`), dynamic range slider fill tracks (`--fill-pct`), non-clipping block scroll containers (`.sliders-scroll`, `.left-panel`), shortcuts modal, and toast notifications.
- `engine.js` — Deterministic rendering engine:
  - `SeededRandom`: Mulberry32 PRNG (`seed` reproduces exact splatter & paper layouts across export scales).
  - `PerlinNoise2D`: 2D gradient Perlin noise + multi-octave fBm (`fbm()`).
  - `WatercolorEngine`: Precomputed 5-channel `Float64Array` Summed-Area Tables (`this.integralTables`), $O(1)$ 4-quadrant Kuwahara filter, separable $O(1)$ sliding-window box blurs, border-rejected saliency mask, fBm wash mask, wet water-ring darkening, Sobel ink contours, and boundary-normal vector splatter/drip synthesis.
- `app.js` — `SAMPLE_CATALOG` (4 free-to-use CORS-enabled Unsplash photos + offline procedural fallback), `PRESETS` (8 frozen style configurations with pigment swatches), `HistoryManager` (25-step Undo/Redo stack), and `SplashCanvasApp` controller.

## Key Engineering Invariants
1. **$O(1)$ Complexity via Precomputed Integral Images**:
   - `this.integralTables` (`sumR`, `sumG`, `sumB`, `sumL`, `sumL2` as `Float64Array`) are built once per image in `loadImage()`. Never replace the Summed-Area Table queries in `_ensurePaintedLayer()` or the sliding-window accumulators in `_boxBlurFloat()` / `_createColorBleedBuffer()` with $O(R^2)$ nested loops.
2. **Two-Tier Render Caching**:
   - `_ensurePaintedLayer(params)` memoizes `this.paintedRGB` via `this.lastPaintSignature` and sets `this.lastCacheHit`. Only invalidate it when brush or color-grading sliders change; mask, splatter, drip, sketch, and paper sliders reuse `this.paintedRGB` for sub-15 ms frame times.
3. **Undo / Redo & Reset Consistency**:
   - Before mutating `this.params`, `this.engine.seed`, or `this.engine.userBrushMask`, push a snapshot via `this._recordHistorySnapshot()`.
   - Preserve double-click-to-reset on individual sliders (`resetSingleParameter`) and per-section reset (`resetParameterGroup`).
4. **Sidebar Scroll & Slider Track Integrity**:
   - Keep `.sliders-scroll` and `.left-panel` as `display: block; overflow-y: auto;` so collapsible `<details class="control-group">` elements never flex-shrink or clip child sliders.
   - Always invoke `_updateRangeFillProgress(input)` when updating slider values so the CSS `--fill-pct` gradient matches the thumb position.
