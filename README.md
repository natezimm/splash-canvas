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
The 24 real-time parameters are partitioned into two execution tiers:
- **Tier 1 (Pigment & Grading — 8 parameters)**: `brushRadius`, `wetSmoothness`, `detailFidelity`, `colorSimplification`, `vibrancy`, `luminosity`, `contrast`, `warmth`. Modifying these updates `this.paintedRGB` (~20–35 ms at 1080p).
- **Tier 2 (Wash Mask, Bleed, Splatters, Sketch & Paper — 16 parameters + Brush Strokes)**: Reuses `this.paintedRGB` via `this.lastPaintSignature` (`Cached` pass indicator in the top telemetry bar), completing frames in ~8–15 ms.

### 3. Wet-Edge Pigment Pooling ("Water Rings") & Granulation
To simulate capillary flow carrying pigment toward the drying perimeter of a watercolor wash (the coffee-ring effect), pixels within the boundary transition band $\alpha \in [0.08, 0.72]$ undergo sinusoidal rim darkening:

$$D(\alpha) = 1 - k_{\text{ring}} \cdot \sin\left(\frac{\alpha - 0.08}{0.64}\,\pi\right)$$

Simultaneously, cold-press paper heightfields modulate local pigment density (`pigmentGranulation`) and break mid-tone washes across paper peaks (`paperShowThrough`).

### 4. Boundary-Normal Vector Splatters & Gravity Drips
Rather than overlaying static clip-art textures, `_renderSplattersAndDrips()` scans the wash transition zone ($0.12 < \alpha < 0.78$), computes outward spatial gradients $\vec{n} = -\nabla \alpha / \|\nabla \alpha\|$, samples local interior subject chromaticity from `bledColors`, and projects radial-gradient blooms, velocity-stretched elliptical droplets, and vertical gravity drips outward along $\vec{n}$.

---

## Studio UX & Interactive Features

- **8 Curated Style Presets**: *Bespoke Portrait*, *Atmospheric Cloud*, *Line & Wash*, *Expressive Splash*, *Soft Pastel Glaze*, *Dry-Brush Atelier*, *Full-Bleed Scene*, and *Botanical Sepia*.
- **24 Real-Time Parameters**: Grouped into 6 collapsible categories with live parameter search filtering, active slider progress fills, **double-click single-slider reset**, and **per-section Reset** actions.
- **25-Step Undo / Redo History Stack**: Full state snapshots (`Cmd/Ctrl + Z` and `Cmd/Ctrl + Shift + Z`) across slider adjustments, preset switches, seed re-rolls, and manual mask brush strokes.
- **Curated Free-to-Use Unsplash Sample Gallery**: Ships with 4 CORS-enabled high-resolution Unsplash reference photographs (*Expressive Studio Portrait*, *Golden Retriever Outdoors*, *Coastal Surfer & Ocean Spray*, *Venetian Canal Architecture*) with photographer attribution and automatic offline procedural fallback.
- **Smart Saliency + Optional MediaPipe Neural Segmentation**: Combines border-rejected foreground saliency with one-click client-side neural person segmentation.
- **Interactive Mask Refinement Brush**: Paint directly on the canvas with **Reveal Paint** or **Dissolve Paper** (`[` and `]` to resize brush radius).
- **4 Viewport Modes + Hold-to-Compare**: Switch between *Artwork* (`1`), *Split Compare* (`2`), *Original* (`3`), and *Alpha Mask* (`4`), or hold `Spacebar` at any time to peek at the unedited source photo.
- **Multi-Scale Print Export**: Export `1x Native`, `1.5x Print`, or `2x Ultra-HD` PNGs with deterministic PRNG seed preservation.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `1` / `2` / `3` / `4` | Switch View Mode (*Artwork*, *Split Compare*, *Original*, *Alpha Mask*) |
| `Space` (Hold) | Temporarily peek at the original unedited photograph |
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
```
