# CLAUDE.md — SplashCanvas Developer & AI Assistant Guide

## Project Summary
**SplashCanvas** is a client-side photo-to-watercolor studio web app located in `/Users/nathan/Coding/splash-canvas` (GitHub: `https://github.com/natezimm/splash-canvas`). It replicates bespoke portrait/scene watercolor artwork—complete with smart subject cutout, outward color-matched splatters, wet water-ring edge darkening, vertical drips, ink linework, and cold-press paper texture—entirely in the browser using HTML5 Canvas.

## Quick Commands
Because SplashCanvas is a dependency-free static web app, no build or compile step is required:

```bash
# Open directly in macOS default browser
open index.html

# Or serve locally (enables full WASM/MediaPipe support without file:// CORS limits)
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## Codebase Structure
- `index.html` — Studio layout: top action bar, left preset & brush sidebar, center interactive canvas stage (Artwork / Split Compare / Original / Subject Mask), and right 24-slider effect panel.
- `styles.css` — Dark theme variables, responsive 3-column grid (`.workspace`), custom range sliders, and non-clipping block scroll containers (`.sliders-scroll`, `.left-panel`).
- `engine.js` — Core rendering engine:
  - `SeededRandom`: Deterministic PRNG (`seed` re-rolls splatters reproducibly).
  - `PerlinNoise2D`: 2D Perlin noise + multi-octave fBm (`fbm()`) for paper grain, outer clouds, and organic brush-edge roughness.
  - `WatercolorEngine`: Integral-image (Summed-Area Table) Kuwahara filter, wet wash blur, smart subject cutout, user brush mask refinement, color-bleed aura, water-ring darkening, Sobel sketch outlines, and procedural splatter/drip generator.
- `app.js` — `PRESETS` array (8 curated styles) and `SplashCanvasApp` controller handling DOM events, zoom/pan, split-screen comparison clipping, procedural sample scenes, MediaPipe Selfie Segmentation, and 1x/1.5x/2x PNG export.

## Key Implementation Invariants
1. **Performance (`O(1)` Kuwahara & Box Blur)**:
   - Always use the Summed-Area Tables in `WatercolorEngine._ensurePaintedLayer()` and separable sliding-window box blurs (`_boxBlurFloat`, `_createColorBleedBuffer`). Avoid naive $O(R^2)$ per-pixel loops so real-time slider scrubbing stays under ~25–45 ms per frame.
2. **Two-Tier Render Caching**:
   - `_ensurePaintedLayer(params)` caches `this.paintedRGB` using `this.lastPaintSignature`. Only invalidate it when brush or color-grading sliders change; mask, splatter, drip, sketch, and paper sliders reuse `this.paintedRGB` for near-instant updates.
3. **Sidebar Layout Integrity**:
   - `.sliders-scroll` and `.left-panel` use `display: block; overflow-y: auto;` so collapsible `<details class="control-group">` elements never flex-shrink or clip their child sliders.
4. **Preset Completeness**:
   - Every `input[data-param]` in `index.html` must have a matching key in all 8 preset definitions inside `PRESETS` in `app.js`.
