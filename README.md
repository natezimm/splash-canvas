# SplashCanvas — Client-Side Non-Photorealistic Watercolor Studio

**SplashCanvas** is a zero-dependency, 100% client-side non-photorealistic rendering (NPR) web application that transforms photographs into bespoke watercolor portraits, pet illustrations, and architectural line-and-wash paintings directly in the browser.

Designed for interactive 60 FPS studio workflows without requiring a backend GPU server or build toolchain, SplashCanvas combines **$O(1)$ Summed-Area Table anisotropic Kuwahara filtering**, **multi-centroid border saliency segmentation**, **Fractional Brownian Motion (fBm) wash diffusion**, **wet-edge pigment pooling ("water rings")**, and **boundary-normal vector splatter synthesis**.

---

## System Architecture & Rendering Pipeline

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: IMAGE INGESTION & PREPASS                  │
│                            WatercolorEngine.loadImage()                    │
├──────────────────────┬───────────────────────────┬─────────────────────────┤
│  5-Channel Float64   │  3×3 Sobel Gradient       │  Multi-Centroid Border  │
│  Summed-Area Tables  │  Magnitude Operator       │  Saliency + Center      │
│  (R, G, B, L, L²)    │  (this.edgeField)         │  Prior (autoSubjectMask)│
└──────────┬───────────┴─────────────┬─────────────┴────────────┬────────────┘
           │                         │                          │
           ▼                         ▼                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   STAGE 2: CACHED BASE PIGMENT ABSTRACTION                 │
│                    WatercolorEngine._ensurePaintedLayer()                  │
│  • O(1) 4-Quadrant Anisotropic Kuwahara Filter (via Integral Images)       │
│  • O(1) Separable Wet-Wash Box Smoothing                                   │
│  • Central/Edge Detail Fidelity Blending & Pigment Palette Simplification  │
│  • Perceptual Color Grading (Warmth, Tonal Contrast, Luminosity, Vibrancy) │
│  * Memoized via `lastPaintSignature` (skipped on mask/splatter/paper edits)│
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               STAGE 3: WASH COMPOSITOR & VECTOR SPLATTER PASS              │
│                            WatercolorEngine.render()                       │
│  1. Composite Mask: Saliency/Neural Mask + User Brush + 4-Octave fBm Noise │
│  2. O(1) Sliding-Window Chromatic Bleed Buffer (_createColorBleedBuffer)   │
│  3. Cold-Press Cotton Paper Relief, Valley Granulation & Dry-Brush Gaps    │
│  4. Wet Water-Ring Rim Darkening & Sobel Graphite/Sepia Ink Contours       │
│  5. Boundary-Normal Vector Blooms, Directional Droplets & Gravity Drips    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Algorithmic & Engineering Highlights

### 1. $O(1)$ Per-Pixel Kuwahara Filtering via 64-Bit Summed-Area Tables
Naive Kuwahara filtering evaluates mean and variance across four overlapping $(r+1) \times (r+1)$ quadrants per pixel, scaling at $O(r^2)$ and causing frame drops at larger brush radii. SplashCanvas precomputes five `Float64Array` integral images ($I_R, I_G, I_B, I_L, I_{L^2}$) on image load. Any rectangular quadrant $Q = [x_0, x_1] \times [y_0, y_1]$ with area $A$ is queried in **4 array lookups**:

$$\mu_L(Q) = \frac{1}{A}\Sigma_L(x_0, y_0, x_1, y_1), \quad \sigma_L^2(Q) = \frac{1}{A}\Sigma_{L^2}(x_0, y_0, x_1, y_1) - \mu_L(Q)^2$$

Using 64-bit IEEE-754 floats (`Float64Array`) for the summed-area tables eliminates catastrophic cancellation when computing $\mathbb{E}[L^2] - (\mathbb{E}[L])^2$ on high-resolution ($2\times$ Ultra-HD) canvases.

### 2. Two-Tier Render Memoization
The 25 real-time parameters are partitioned into two execution tiers:
- **Tier 1 (Pigment & Grading — 8 parameters)**: `brushRadius`, `wetSmoothness`, `detailFidelity`, `colorSimplification`, `vibrancy`, `luminosity`, `contrast`, `warmth`. Modifying these updates `this.paintedRGB` (~20–35 ms at 1080p).
- **Tier 2 (Wash Mask, Bleed, Splatters, Sketch & Paper — 17 parameters + Brush Strokes)**: Reuses `this.paintedRGB` via `this.lastPaintSignature` (`Cached` pass indicator in the top telemetry bar), completing frames in ~8–15 ms.

### 3. Spatial Meniscus Wet-Edge Darkening, Glazing & Granulation
To simulate capillary flow carrying pigment toward the drying perimeter of a watercolor wash (the coffee-ring effect), boundary-clamped central differences evaluate the spatial gradient $G = \|\nabla \alpha\|$ directly on `baseMask` using a precomputed static 256-entry sine LUT:

$$M(x, y) = \text{clamp}\left(\frac{G - 0.06}{0.28}, 0, 1\right) \cdot \text{sinLUT}[\text{round}(\alpha \cdot 255)]$$

When $M > 0$, pigment luminance is reduced while saturation is boosted by 15%. Simultaneously:
- **Subtractive Midtone Glaze**: Models Beer-Lambert transmission absorption ($\mathbf{C}_{\text{glaze}} = (\mathbf{C}_{\text{paper}} \odot \mathbf{C}_{\text{fg}}) / 255$).
- **Chromatic Granulation**: Settles pigment into cold-press paper valleys with cool mineral undertones ($+3.5\text{ B}, -2.0\text{ R}$).
- **Procedural Torn-Paper Deckle Edge**: Uses a precomputed 1D perimeter profile in Stage 1 to modulate canvas alpha (`dst[p+3]`) along the border, preserving transparency for PNG exports.

### 4. Boundary-Normal Vector Splatters, Satellite Droplets & Gravity Drips
Rather than overlaying static clip-art textures, `_renderSplattersAndDrips()` scans the wash transition zone ($0.12 < \alpha < 0.78$), computes outward spatial gradients $\vec{n} = -\nabla \alpha / \|\nabla \alpha\|$, samples local interior subject chromaticity from `bledColors`, and projects:
- **Harmonic Capillary Blooms**: 24-vertex polygon blooms with high-frequency capillary petal perturbations.
- **Directional Satellite Spray**: Primary droplets project 1–3 trailing micro-droplets along their velocity vector.
- **Tapered Fluid Gravity Drips**: Closed polygonal fluid contours that taper from origin to neck and pool into a bulbous teardrop head at the terminal point.

---

## Studio UX & Interactive Features

- **Virtual Gallery Framing**: Preview artwork in the viewport inside *Natural Oak*, *Gallery Black*, or *White Float* frames with archival cotton mat boards and 45-degree beveled inner shadows via zero-overhead CSS containers.
- **Print Studio & Archival 300 DPI Export**: Real-time sizing readouts in pixels, inches, and cm @ 300 DPI, multi-scale export (`1x Native`, `1.5x Fine Art`, `2x Ultra-HD`), format selection (lossless PNG, 98% / 92% JPEG), and optional procedural frame compositing for print downloads.
- **Direct Clipboard Copy**: One-click high-resolution PNG copying directly to your system clipboard via `navigator.clipboard.write` with automatic graceful fallback to file download.
- **Standard vs. Advanced View Modes**: Toggle between Standard View (15 essential sliders) and Advanced View (all 25 sliders) with zero layout shift or parameter loss.
- **1-Click Smart Enhance (Magic Polish)**: Uniformly samples ~20,000 source pixels to analyze tonal dynamic range and saturation distribution, auto-tuning contrast, luminous glaze, and pigment vibrancy.
- **Custom Preset Library**: Save custom parameter combinations to local browser storage (`localStorage`) with one-click style recall and deletion.
- **Instant Clipboard Ingestion**: Press `Cmd/Ctrl + V` to paste photos directly from your clipboard without opening a file picker.
- **Pointer-Drag Canvas Stage Panning**: Smoothly pan across the stage on mouse drag when `zoom > 1.0`, keeping `Spacebar` strictly reserved for "Hold to Peek".
- **8 Curated Style Presets**: *Bespoke Portrait*, *Atmospheric Cloud*, *Line & Wash*, *Expressive Splash*, *Soft Pastel Glaze*, *Dry-Brush Atelier*, *Full-Bleed Scene*, and *Botanical Sepia*.
- **25 Real-Time Parameters**: Grouped into 6 collapsible categories with live parameter search filtering, active slider progress fills, **double-click single-slider reset**, and **per-section Reset** actions.
- **25-Step Undo / Redo History Stack**: Full state snapshots (`Cmd/Ctrl + Z` and `Cmd/Ctrl + Shift + Z`) across slider adjustments, preset switches, seed re-rolls, and manual mask brush strokes.
- **Curated Free-to-Use Unsplash Sample Gallery**: Ships with 4 CORS-enabled high-resolution Unsplash reference photographs (*Expressive Studio Portrait*, *Golden Retriever Outdoors*, *Coastal Surfer & Ocean Spray*, *Venetian Canal Architecture*) with photographer attribution and automatic offline procedural fallback.
- **Smart Saliency + Optional MediaPipe Neural Segmentation**: Combines border-rejected foreground saliency with one-click client-side neural person segmentation.
- **Interactive Mask Refinement Brush**: Paint directly on the canvas with **Reveal Paint** or **Dissolve Paper** (`[` and `]` to resize brush radius).
- **4 Viewport Modes + Hold-to-Compare**: Switch between *Artwork* (`1`), *Split Compare* (`2`), *Original* (`3`), and *Alpha Mask* (`4`), or hold `Spacebar` at any time to peek at the unedited source photo.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `1` / `2` / `3` / `4` | Switch View Mode (*Artwork*, *Split Compare*, *Original*, *Alpha Mask*) |
| `Space` (Hold) | Temporarily peek at the original unedited photograph |
| `⌘/Ctrl + V` | Paste image directly from system clipboard |
| `[` / `]` | Decrease / increase interactive mask brush radius |
| `R` | Re-roll deterministic PRNG splatter & wash seed |
| `⌘/Ctrl + Z` | Undo last parameter or mask brush change |
| `⌘/Ctrl + Shift + Z` | Redo parameter or mask brush change |
| `⌘/Ctrl + Scroll` | Zoom canvas viewport in / out |
| `Double-Click Slider` | Reset individual parameter to the active preset's default |
| `?` | Toggle keyboard shortcuts reference modal |

---

## Running Locally

SplashCanvas requires no bundler, Node.js runtime, or build step:

```bash
# Option 1: Open directly in any modern browser
open index.html

# Option 2: Serve via local static HTTP server (recommended for MediaPipe WASM)
python3 -m http.server 8080
# Visit http://localhost:8080

# Option 3: VS Code Live Server
# Click "Go Live" in the status bar or press Alt+L Alt+O
```

---

## License

This project is licensed under the [MIT License](LICENSE).

