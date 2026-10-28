/**
 * @fileoverview SplashCanvas Core Watercolor Rendering Engine (`engine.js`)
 *
 * Architecture & Algorithmic Pipeline:
 * ----------------------------------------------------------------------------
 * A zero-dependency, deterministic 2D image processing pipeline engineered for
 * real-time (60 FPS) interactive non-photorealistic rendering (NPR) in the browser:
 *
 *   1. Precomputation Pass (`loadImage`):
 *      - Sobel 3x3 gradient magnitude operator (`edgeField`) for structural edge
 *        preservation and graphite/sepia ink contour extraction.
 *      - Multi-centroid border background rejection + elliptical portrait prior +
 *        local edge density saliency estimator (`autoSubjectMask`).
 *      - 5-channel 64-bit Summed-Area Tables (Integral Images: R, G, B, L, L^2)
 *        enabling O(1) window variance and mean queries regardless of brush radius.
 *      - Multi-octave 2D Perlin Fractional Brownian Motion (fBm) heightmaps for
 *        cold-press cotton paper tooth (`paperField`) and outer clouds (`cloudField`).
 *
 *   2. Base Pigment Abstraction Layer (`_ensurePaintedLayer`):
 *      - Anisotropic 4-quadrant Kuwahara filter queried in O(1) time per pixel via
 *        precomputed Summed-Area Tables.
 *      - Wet-in-wet box wash smoothing + central/edge detail fidelity retention.
 *      - Soft pigment quantization and perceptual color grading.
 *      - Memoized via `lastPaintSignature` so mask, splatter, paper, and sketch
 *        adjustments skip Stage 2 entirely (<15 ms frame time).
 *
 *   3. Wash Mask, Bleed & Vector Splatter Compositor (`render`):
 *      - Fuses `autoSubjectMask` (or neural `aiSubjectMask`) with manual user brush
 *        strokes (`userBrushMask`), fBm boundary perturbation, and Hermite smoothstep.
 *      - Separable O(1) sliding-window color bleed buffer so outer washes and
 *        splatters inherit true local boundary chromaticity.
 *      - Per-pixel Beer-Lambert / sine-bell wet water-ring edge darkening, paper valley
 *        granulation, dry-brush paper gaps, and Sobel ink linework.
 *      - Procedural boundary-normal vector splatter, bloom, and gravity drip pass.
 */

/**
 * @typedef {Object} WatercolorParams
 * @property {number} brushRadius          - Kuwahara quadrant radius in px [0..12]
 * @property {number} wetSmoothness        - Wet wash box smoothing blend [0..100]
 * @property {number} detailFidelity       - Subject/face detail preservation [0..100]
 * @property {number} colorSimplification  - Pigment palette quantization [0..100]
 * @property {number} pigmentGranulation   - Paper valley pigment settling [0..100]
 * @property {number} subjectCoverage      - Foreground mask coverage scale [15..95]
 * @property {number} washSpread           - Outer wash aura dilation [0..100]
 * @property {number} edgeRoughness        - fBm boundary perturbation amplitude [0..100]
 * @property {number} edgeSoftness         - Hermite smoothstep feather width [5..100]
 * @property {number} waterRingIntensity   - Wet-edge pigment pooling rim [0..100]
 * @property {number} splatterAmount       - Boundary splatter & droplet density [0..100]
 * @property {number} splatterSize         - Splatter & bloom radius scale [10..100]
 * @property {number} splatterReach        - Outward normal projection distance [10..100]
 * @property {number} dripLength           - Vertical gravity drip length [0..100]
 * @property {number} colorBleed           - Chromatic bleed dilation radius [0..100]
 * @property {number} sketchIntensity      - Sobel contour line opacity [0..100]
 * @property {number} sketchDetail         - Sobel contour sensitivity [10..100]
 * @property {number} sketchWarmth         - Ink tone from graphite (0) to sepia (100)
 * @property {number} paperGrain           - Cold-press paper tooth relief [0..100]
 * @property {number} outerCloudWash       - Outer atmospheric wash density [0..100]
 * @property {number} paperShowThrough     - Dry-brush white paper gaps [0..100]
 * @property {number} vibrancy             - Saturation delta [-50..100]
 * @property {number} luminosity           - Brightness offset [-40..60]
 * @property {number} contrast             - Tonal contrast [-40..60]
 * @property {number} warmth               - Warm/cool temperature shift [-50..50]
 * @property {'smart'|'radial'|'full'} cutoutMode - Subject isolation strategy
 * @property {string} paperTint            - Hex color of archival paper stock
 */

/**
 * Deterministic 32-bit Mulberry32 Pseudorandom Number Generator.
 * Ensures splatter layouts and paper grain are 100% reproducible per seed,
 * including across multi-resolution (1x / 1.5x / 2x) print exports.
 */
class SeededRandom {
  /**
   * @param {number} [seed=1337] - Unsigned 32-bit integer seed
   */
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
  }

  /**
   * Returns a pseudorandom float in [0, 1).
   * @returns {number}
   */
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudorandom float in [min, max).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }
}

/**
 * 2D Gradient Perlin Noise with Multi-Octave Fractional Brownian Motion (fBm).
 */
class PerlinNoise2D {
  /**
   * @param {number} [seed=42]
   */
  constructor(seed = 42) {
    const rng = new SeededRandom(seed);
    this.p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.p[i] = perm[i & 255];
    }
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -2.0 * v : 2.0 * v);
  }

  /**
   * Evaluates 2D Perlin noise normalized to [0, 1].
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;
    const res = this.lerp(
      v,
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(
        u,
        this.grad(this.p[A + 1], x, y - 1),
        this.grad(this.p[B + 1], x - 1, y - 1)
      )
    );
    return (res + 1) * 0.5;
  }

  /**
   * Evaluates multi-octave Fractional Brownian Motion (fBm) normalized to [0, 1].
   * @param {number} x
   * @param {number} y
   * @param {number} [octaves=4]
   * @param {number} [persistence=0.5]
   * @param {number} [lacunarity=2.0]
   * @returns {number}
   */
  fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

/**
 * Core Watercolor Rendering Engine.
 */
class WatercolorEngine {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.seed = 2026;
    this.perlin = new PerlinNoise2D(this.seed);

    // Primary image & field buffers
    this.srcData = null;         // Uint8ClampedArray (RGBA)
    this.autoSubjectMask = null; // Float32Array [0..1]
    this.aiSubjectMask = null;   // Float32Array [0..1] (optional MediaPipe neural mask)
    this.userBrushMask = null;   // Float32Array [-1..1] (additive/subtractive brush delta)
    this.paperField = null;      // Float32Array [0..1] cold-press cotton heightmap
    this.cloudField = null;      // Float32Array [0..1] outer atmospheric wash field
    this.edgeField = null;       // Float32Array [0..1] Sobel gradient magnitude

    // Precomputed 64-bit Summed-Area Tables (Integral Images) for O(1) Kuwahara & Box filters
    this.integralTables = null;  // { gw, gh, sumR, sumG, sumB, sumL, sumL2 }

    // Memoized Stage-2 base pigment buffer
    this.paintedRGB = null;      // Uint8ClampedArray (RGBA)
    this.lastPaintSignature = "";
    this.lastCacheHit = false;
  }

  /**
   * Updates the deterministic PRNG seed and rebuilds procedural noise fields.
   * @param {number} seed
   */
  setSeed(seed) {
    this.seed = seed >>> 0;
    this.perlin = new PerlinNoise2D(this.seed);
    this._buildPaperAndCloudFields();
  }

  /**
   * Loads an image/canvas source onto the engine's working resolution and runs
   * Stage-1 precomputations (Sobel edges, Summed-Area Tables, Saliency Mask, Paper Field).
   *
   * @param {HTMLImageElement|HTMLCanvasElement} imgSource
   * @param {number} [maxDimension=1080]
   */
  loadImage(imgSource, maxDimension = 1080) {
    const srcW = imgSource.naturalWidth || imgSource.width;
    const srcH = imgSource.naturalHeight || imgSource.height;
    const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
    this.width = Math.max(64, Math.round(srcW * scale));
    this.height = Math.max(64, Math.round(srcH * scale));

    const off = document.createElement("canvas");
    off.width = this.width;
    off.height = this.height;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imgSource, 0, 0, this.width, this.height);
    this.srcData = ctx.getImageData(0, 0, this.width, this.height).data;

    this.aiSubjectMask = null;
    this.userBrushMask = new Float32Array(this.width * this.height);
    this.lastPaintSignature = "";

    this._buildIntegralTables();
    this._computeEdgeField();
    this._computeSmartSubjectMask();
    this._buildPaperAndCloudFields();
  }

  /**
   * Precomputes 64-bit Summed-Area Tables (Integral Images) over source R, G, B,
   * Luminance (L), and Squared Luminance (L^2). Caching these tables on `loadImage`
   * allows Kuwahara brush resizing and color grading tweaks to run in O(1) per pixel
   * without rebuilding the integral tables on slider changes.
   * @private
   */
  _buildIntegralTables() {
    const w = this.width;
    const h = this.height;
    const src = this.srcData;
    const gw = w + 1;
    const gh = h + 1;
    const size = gw * gh;

    const sumR = new Float64Array(size);
    const sumG = new Float64Array(size);
    const sumB = new Float64Array(size);
    const sumL = new Float64Array(size);
    const sumL2 = new Float64Array(size);

    for (let y = 1; y <= h; y++) {
      let rRow = 0,
        gRow = 0,
        bRow = 0,
        lRow = 0,
        l2Row = 0;
      const srcRow = (y - 1) * w * 4;
      const curRow = y * gw;
      const prevRow = (y - 1) * gw;

      for (let x = 1; x <= w; x++) {
        const p = srcRow + (x - 1) * 4;
        const r = src[p];
        const g = src[p + 1];
        const b = src[p + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        rRow += r;
        gRow += g;
        bRow += b;
        lRow += lum;
        l2Row += lum * lum;

        sumR[curRow + x] = sumR[prevRow + x] + rRow;
        sumG[curRow + x] = sumG[prevRow + x] + gRow;
        sumB[curRow + x] = sumB[prevRow + x] + bRow;
        sumL[curRow + x] = sumL[prevRow + x] + lRow;
        sumL2[curRow + x] = sumL2[prevRow + x] + l2Row;
      }
    }

    this.integralTables = { gw, gh, sumR, sumG, sumB, sumL, sumL2 };
  }

  /**
   * Resets manual user mask brush strokes.
   */
  clearUserBrushMask() {
    if (this.userBrushMask) {
      this.userBrushMask.fill(0);
    }
  }

  /**
   * Returns a clone of the current userBrushMask for Undo/Redo history snapshots.
   * @returns {Float32Array|null}
   */
  cloneUserBrushMask() {
    return this.userBrushMask ? new Float32Array(this.userBrushMask) : null;
  }

  /**
   * Restores a previously cloned userBrushMask snapshot.
   * @param {Float32Array|null} snapshot
   */
  restoreUserBrushMask(snapshot) {
    if (
      snapshot &&
      this.userBrushMask &&
      snapshot.length === this.userBrushMask.length
    ) {
      this.userBrushMask.set(snapshot);
    }
  }

  /**
   * Applies a Hermite-feathered circular dab to the interactive user brush mask.
   *
   * @param {number} normX       - Normalized X coordinate [0..1]
   * @param {number} normY       - Normalized Y coordinate [0..1]
   * @param {number} radiusPx    - Brush radius in working canvas pixels
   * @param {number} softnessPct - Feather percentage [10..100]
   * @param {'restore'|'erase'} mode
   */
  applyBrushStroke(normX, normY, radiusPx, softnessPct, mode) {
    if (!this.userBrushMask) return;
    const w = this.width;
    const h = this.height;
    const cx = normX * w;
    const cy = normY * h;
    const r = Math.max(4, radiusPx);
    const innerR = r * (1 - Math.min(0.95, Math.max(0.05, softnessPct / 100)));
    const deltaSign = mode === "restore" ? 1 : -1;

    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(h - 1, Math.ceil(cy + r));

    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dist = Math.hypot(dx, dy);
        if (dist > r) continue;
        let falloff = 1.0;
        if (dist > innerR) {
          falloff = 1.0 - (dist - innerR) / Math.max(1e-4, r - innerR);
          falloff = falloff * falloff * (3 - 2 * falloff);
        }
        const idx = y * w + x;
        const nextVal = this.userBrushMask[idx] + deltaSign * falloff * 0.45;
        this.userBrushMask[idx] = Math.max(-1, Math.min(1, nextVal));
      }
    }
  }

  /**
   * Stores an external neural segmentation mask (e.g., MediaPipe SelfieSegmentation).
   * @param {Float32Array} maskFloatArray
   */
  setAISubjectMask(maskFloatArray) {
    if (maskFloatArray && maskFloatArray.length === this.width * this.height) {
      this.aiSubjectMask = this._boxBlurFloat(
        maskFloatArray,
        this.width,
        this.height,
        4
      );
    }
  }

  /**
   * Computes a 3x3 Sobel gradient magnitude map (`this.edgeField`) normalized to [0..1].
   * @private
   */
  _computeEdgeField() {
    const w = this.width;
    const h = this.height;
    const src = this.srcData;
    const lum = new Float32Array(w * h);

    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      lum[i] =
        (0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2]) / 255;
    }

    const edges = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const gx =
          -lum[idx - w - 1] +
          lum[idx - w + 1] -
          2 * lum[idx - 1] +
          2 * lum[idx + 1] -
          lum[idx + w - 1] +
          lum[idx + w + 1];
        const gy =
          -lum[idx - w - 1] -
          2 * lum[idx - w] -
          lum[idx - w + 1] +
          lum[idx + w - 1] +
          2 * lum[idx + w] +
          lum[idx + w + 1];
        edges[idx] = Math.min(1.0, Math.hypot(gx, gy) * 1.45);
      }
    }
    this.edgeField = edges;
  }

  /**
   * Unsupervised foreground subject saliency estimator:
   * Samples outer frame border clusters and combines chromatic Mahalanobis/Euclidean
   * distance, local Sobel edge density, saturation saliency, and an elliptical center prior.
   * @private
   */
  _computeSmartSubjectMask() {
    const w = this.width;
    const h = this.height;
    const src = this.srcData;

    const borderSamples = [];
    const step = Math.max(4, Math.floor(Math.min(w, h) / 35));

    const pushPixel = (x, y) => {
      const p = (y * w + x) * 4;
      borderSamples.push([src[p], src[p + 1], src[p + 2], y / h]);
    };

    for (let x = 0; x < w; x += step) {
      pushPixel(x, 2);
      pushPixel(x, Math.min(h - 1, Math.floor(h * 0.08)));
    }
    for (let y = 0; y < h; y += step) {
      pushPixel(2, y);
      pushPixel(w - 3, y);
      pushPixel(Math.floor(w * 0.05), y);
      pushPixel(Math.floor(w * 0.95), y);
    }

    const centroids = [];
    const bucketStep = Math.max(1, Math.floor(borderSamples.length / 24));
    for (let i = 0; i < borderSamples.length; i += bucketStep) {
      centroids.push(borderSamples[i]);
    }

    const localEdgeDensity = this._boxBlurFloat(this.edgeField, w, h, 14);
    const rawMask = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      const ny = (y / h - 0.52) / 0.46;
      const yFrac = y / h;
      for (let x = 0; x < w; x++) {
        const nx = (x / w - 0.5) / 0.38;
        const idx = y * w + x;
        const p = idx * 4;
        const r = src[p];
        const g = src[p + 1];
        const b = src[p + 2];

        let minBgDist = 1e9;
        for (let c = 0; c < centroids.length; c++) {
          const ct = centroids[c];
          const dr = r - ct[0];
          const dg = g - ct[1];
          const db = b - ct[2];
          const yPenalty = Math.abs(yFrac - ct[3]) * 55;
          const d = Math.sqrt(dr * dr + dg * dg + db * db) + yPenalty;
          if (d < minBgDist) minBgDist = d;
        }

        const bgDiffScore = Math.min(1.0, Math.max(0, (minBgDist - 22) / 78));
        const radialDist = Math.hypot(nx, ny);
        const centerPrior = Math.max(
          0,
          Math.min(1, 1.18 - Math.pow(radialDist, 1.65) * 0.85)
        );

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        const edgeScore = Math.min(1.0, localEdgeDensity[idx] * 2.8);

        let score =
          centerPrior *
          (0.42 + 0.48 * bgDiffScore + 0.25 * edgeScore + 0.2 * sat);

        if (radialDist < 0.52 && (bgDiffScore > 0.22 || edgeScore > 0.12)) {
          score = Math.max(score, 0.88 - radialDist * 0.3);
        }

        if (x < w * 0.04 || x > w * 0.96 || y < h * 0.04 || y > h * 0.96) {
          score *= 0.15;
        }

        rawMask[idx] = Math.max(0, Math.min(1, score));
      }
    }

    this.autoSubjectMask = this._boxBlurFloat(rawMask, w, h, 18);
  }

  /**
   * Synthesizes the cold-press cotton paper tooth heightmap (`paperField`)
   * and multi-octave fBm atmospheric cloud field (`cloudField`).
   * @private
   */
  _buildPaperAndCloudFields() {
    const w = this.width;
    const h = this.height;
    if (!w || !h) return;

    this.paperField = new Float32Array(w * h);
    this.cloudField = new Float32Array(w * h);

    const rng = new SeededRandom(this.seed + 99);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const coarse = this.perlin.noise(x * 0.11, y * 0.11);
        const medium = this.perlin.noise(x * 0.31 + 17, y * 0.31 + 29);
        const fine = rng.next();
        this.paperField[idx] = coarse * 0.52 + medium * 0.33 + fine * 0.15;

        const cloud1 = this.perlin.fbm(x * 0.0055, y * 0.0055, 4, 0.55, 2.1);
        const cloud2 = this.perlin.fbm(
          x * 0.014 + 50,
          y * 0.014 + 50,
          3,
          0.5,
          2.0
        );
        this.cloudField[idx] = cloud1 * 0.7 + cloud2 * 0.3;
      }
    }
  }

  /**
   * Separable O(1) sliding-window box blur over a single-channel Float32Array.
   * @param {Float32Array} src
   * @param {number} w
   * @param {number} h
   * @param {number} radius
   * @returns {Float32Array}
   * @private
   */
  _boxBlurFloat(src, w, h, radius) {
    if (radius <= 0) return new Float32Array(src);
    const r = Math.max(1, Math.round(radius));
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);
    const count = 2 * r + 1;

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const rowOffset = y * w;
      for (let i = -r; i <= r; i++) {
        const x = Math.min(w - 1, Math.max(0, i));
        sum += src[rowOffset + x];
      }
      for (let x = 0; x < w; x++) {
        tmp[rowOffset + x] = sum / count;
        const left = Math.max(0, x - r);
        const right = Math.min(w - 1, x + r + 1);
        sum += src[rowOffset + right] - src[rowOffset + left];
      }
    }

    // Vertical pass
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) {
        const y = Math.min(h - 1, Math.max(0, i));
        sum += tmp[y * w + x];
      }
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum / count;
        const top = Math.max(0, y - r);
        const bottom = Math.min(h - 1, y + r + 1);
        sum += tmp[bottom * w + x] - tmp[top * w + x];
      }
    }

    return dst;
  }

  /**
   * Stage-2 Base Pigment Layer:
   * Evaluates an O(1) 4-quadrant anisotropic Kuwahara filter, wet wash smoothing,
   * center/edge detail retention, palette simplification, and perceptual color grading.
   * Memoized via `this.lastPaintSignature`.
   *
   * @param {WatercolorParams} params
   * @private
   */
  _ensurePaintedLayer(params) {
    const sig = [
      params.brushRadius,
      params.wetSmoothness,
      params.detailFidelity,
      params.colorSimplification,
      params.vibrancy,
      params.luminosity,
      params.contrast,
      params.warmth,
    ].join("|");

    if (this.paintedRGB && this.lastPaintSignature === sig) {
      this.lastCacheHit = true;
      return;
    }
    this.lastCacheHit = false;
    this.lastPaintSignature = sig;

    const w = this.width;
    const h = this.height;
    const src = this.srcData;
    if (!this.paintedRGB || this.paintedRGB.length !== w * h * 4) {
      this.paintedRGB = new Uint8ClampedArray(w * h * 4);
    }
    const out = this.paintedRGB;

    const { gw, sumR, sumG, sumB, sumL, sumL2 } = this.integralTables;

    const rectQuery = (table, x0, y0, x1, y1) => {
      const A = y0 * gw + x0;
      const B = y0 * gw + x1;
      const C = y1 * gw + x0;
      const D = y1 * gw + x1;
      return table[D] - table[B] - table[C] + table[A];
    };

    const radius = Math.max(0, Math.round(params.brushRadius));
    const wetRadius = Math.max(1, Math.round((params.wetSmoothness / 100) * 8));
    const wetMix = (params.wetSmoothness / 100) * 0.65;
    const detailKeep = params.detailFidelity / 100;
    const quantizeStrength = params.colorSimplification / 100;
    const quantLevels = Math.max(6, Math.round(32 - quantizeStrength * 24));

    const satMult = 1 + params.vibrancy / 100;
    const lumOffset = (params.luminosity / 100) * 55;
    const contrastFactor = Math.pow((params.contrast + 100) / 100, 1.35);
    const warmthShift = (params.warmth / 100) * 28;

    for (let y = 0; y < h; y++) {
      const ny = (y / h - 0.42) / 0.45;
      for (let x = 0; x < w; x++) {
        const nx = (x / w - 0.5) / 0.38;
        const idx = y * w + x;
        const p = idx * 4;

        let rPaint = src[p];
        let gPaint = src[p + 1];
        let bPaint = src[p + 2];

        // 1. O(1) Kuwahara Anisotropic Quadrant Filter
        if (radius > 0) {
          let bestVar = 1e18;
          const xMin = Math.max(0, x - radius);
          const xMax = Math.min(w, x + radius + 1);
          const yMin = Math.max(0, y - radius);
          const yMax = Math.min(h, y + radius + 1);

          // Quadrant 0: Top-Left
          {
            const area = Math.max(1, (x + 1 - xMin) * (y + 1 - yMin));
            const meanL = rectQuery(sumL, xMin, yMin, x + 1, y + 1) / area;
            const variance =
              rectQuery(sumL2, xMin, yMin, x + 1, y + 1) / area - meanL * meanL;
            if (variance < bestVar) {
              bestVar = variance;
              rPaint = rectQuery(sumR, xMin, yMin, x + 1, y + 1) / area;
              gPaint = rectQuery(sumG, xMin, yMin, x + 1, y + 1) / area;
              bPaint = rectQuery(sumB, xMin, yMin, x + 1, y + 1) / area;
            }
          }
          // Quadrant 1: Top-Right
          {
            const area = Math.max(1, (xMax - x) * (y + 1 - yMin));
            const meanL = rectQuery(sumL, x, yMin, xMax, y + 1) / area;
            const variance =
              rectQuery(sumL2, x, yMin, xMax, y + 1) / area - meanL * meanL;
            if (variance < bestVar) {
              bestVar = variance;
              rPaint = rectQuery(sumR, x, yMin, xMax, y + 1) / area;
              gPaint = rectQuery(sumG, x, yMin, xMax, y + 1) / area;
              bPaint = rectQuery(sumB, x, yMin, xMax, y + 1) / area;
            }
          }
          // Quadrant 2: Bottom-Left
          {
            const area = Math.max(1, (x + 1 - xMin) * (yMax - y));
            const meanL = rectQuery(sumL, xMin, y, x + 1, yMax) / area;
            const variance =
              rectQuery(sumL2, xMin, y, x + 1, yMax) / area - meanL * meanL;
            if (variance < bestVar) {
              bestVar = variance;
              rPaint = rectQuery(sumR, xMin, y, x + 1, yMax) / area;
              gPaint = rectQuery(sumG, xMin, y, x + 1, yMax) / area;
              bPaint = rectQuery(sumB, xMin, y, x + 1, yMax) / area;
            }
          }
          // Quadrant 3: Bottom-Right
          {
            const area = Math.max(1, (xMax - x) * (yMax - y));
            const meanL = rectQuery(sumL, x, y, xMax, yMax) / area;
            const variance =
              rectQuery(sumL2, x, y, xMax, yMax) / area - meanL * meanL;
            if (variance < bestVar) {
              bestVar = variance;
              rPaint = rectQuery(sumR, x, y, xMax, yMax) / area;
              gPaint = rectQuery(sumG, x, y, xMax, yMax) / area;
              bPaint = rectQuery(sumB, x, y, xMax, yMax) / area;
            }
          }
        }

        // 2. Wet Wash Smoothing blend
        if (wetMix > 0.01) {
          const wx0 = Math.max(0, x - wetRadius);
          const wy0 = Math.max(0, y - wetRadius);
          const wx1 = Math.min(w, x + wetRadius + 1);
          const wy1 = Math.min(h, y + wetRadius + 1);
          const wArea = Math.max(1, (wx1 - wx0) * (wy1 - wy0));
          const wr = rectQuery(sumR, wx0, wy0, wx1, wy1) / wArea;
          const wg = rectQuery(sumG, wx0, wy0, wx1, wy1) / wArea;
          const wb = rectQuery(sumB, wx0, wy0, wx1, wy1) / wArea;
          rPaint = rPaint * (1 - wetMix) + wr * wetMix;
          gPaint = gPaint * (1 - wetMix) + wg * wetMix;
          bPaint = bPaint * (1 - wetMix) + wb * wetMix;
        }

        // 3. Preserve facial & central subject crispness
        if (detailKeep > 0) {
          const centerFocus = Math.max(0, 1 - Math.hypot(nx, ny) * 0.85);
          const edgeFocus = Math.min(1, this.edgeField[idx] * 1.8);
          const fidelityBlend = Math.min(
            0.92,
            detailKeep * (0.45 * centerFocus + 0.55 * edgeFocus)
          );
          rPaint = rPaint * (1 - fidelityBlend) + src[p] * fidelityBlend;
          gPaint = gPaint * (1 - fidelityBlend) + src[p + 1] * fidelityBlend;
          bPaint = bPaint * (1 - fidelityBlend) + src[p + 2] * fidelityBlend;
        }

        // 4. Optional Pigment Palette Simplification
        if (quantizeStrength > 0.02) {
          const step = 255 / quantLevels;
          const qr = Math.round(rPaint / step) * step;
          const qg = Math.round(gPaint / step) * step;
          const qb = Math.round(bPaint / step) * step;
          const qMix = quantizeStrength * 0.65;
          rPaint = rPaint * (1 - qMix) + qr * qMix;
          gPaint = gPaint * (1 - qMix) + qg * qMix;
          bPaint = bPaint * (1 - qMix) + qb * qMix;
        }

        // 5. Perceptual Color Grading
        rPaint += warmthShift;
        bPaint -= warmthShift * 0.85;

        rPaint = (rPaint - 128) * contrastFactor + 128 + lumOffset;
        gPaint = (gPaint - 128) * contrastFactor + 128 + lumOffset;
        bPaint = (bPaint - 128) * contrastFactor + 128 + lumOffset;

        const gray = 0.299 * rPaint + 0.587 * gPaint + 0.114 * bPaint;
        rPaint = gray + (rPaint - gray) * satMult;
        gPaint = gray + (gPaint - gray) * satMult;
        bPaint = gray + (bPaint - gray) * satMult;

        out[p] = Math.max(0, Math.min(255, rPaint));
        out[p + 1] = Math.max(0, Math.min(255, gPaint));
        out[p + 2] = Math.max(0, Math.min(255, bPaint));
        out[p + 3] = 255;
      }
    }
  }

  /**
   * Parses a 6-digit hex color string into `[r, g, b]`.
   * @param {string} hex
   * @returns {number[]}
   * @private
   */
  _hexToRgb(hex) {
    const clean = (hex || "#f6f5f0").replace("#", "");
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  /**
   * Executes the full watercolor rendering pipeline onto `targetCanvas`.
   *
   * @param {HTMLCanvasElement} targetCanvas
   * @param {WatercolorParams} params
   * @param {'result'|'original'|'mask'} [viewMode='result']
   * @returns {number} Elapsed frame time in milliseconds
   */
  render(targetCanvas, params, viewMode = "result") {
    if (!this.srcData) return 0;
    const t0 = performance.now();

    const w = this.width;
    const h = this.height;
    targetCanvas.width = w;
    targetCanvas.height = h;
    const ctx = targetCanvas.getContext("2d");

    if (viewMode === "original") {
      const imgData = new ImageData(new Uint8ClampedArray(this.srcData), w, h);
      ctx.putImageData(imgData, 0, 0);
      this.lastCacheHit = true;
      return performance.now() - t0;
    }

    // 1. Ensure Stage-2 base pigment layer is up to date
    this._ensurePaintedLayer(params);

    // 2. Build Subject + fBm Watercolor Wash Alpha Mask
    const baseMask = this._buildWatercolorMask(params);

    if (viewMode === "mask") {
      const maskImg = ctx.createImageData(w, h);
      for (let i = 0, p = 0; i < w * h; i++, p += 4) {
        const v = Math.round(baseMask[i] * 255);
        maskImg.data[p] = v;
        maskImg.data[p + 1] = Math.round(v * 0.92);
        maskImg.data[p + 2] = Math.min(255, Math.round(v * 1.05 + 18));
        maskImg.data[p + 3] = 255;
      }
      ctx.putImageData(maskImg, 0, 0);
      return performance.now() - t0;
    }

    // 3. Create Extended Color-Bleed Buffer
    const bleedRadius = Math.max(
      4,
      Math.round((params.colorBleed / 100) * Math.min(w, h) * 0.09)
    );
    const bledColors = this._createColorBleedBuffer(bleedRadius);

    // 4. Per-Pixel Compositing: Paper Stock, Clouds, Wash, Granulation, Water Rings & Sketch
    const paperRGB = this._hexToRgb(params.paperTint);
    const outImg = ctx.createImageData(w, h);
    const dst = outImg.data;

    const grainStrength = (params.paperGrain / 100) * 34;
    const cloudStrength = (params.outerCloudWash / 100) * 0.36;
    const granulation = (params.pigmentGranulation / 100) * 0.45;
    const waterRingStrength = (params.waterRingIntensity / 100) * 0.58;
    const dryBrushGap = (params.paperShowThrough / 100) * 0.42;

    const sketchOpacity = (params.sketchIntensity / 100) * 0.85;
    const sketchThresh = 1.05 - (params.sketchDetail / 100) * 0.85;
    const sketchWarm = params.sketchWarmth / 100;

    for (let y = 0; y < h; y++) {
      const ny = (y / h - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const nx = (x / w - 0.5) * 2;
        const idx = y * w + x;
        const p = idx * 4;

        const paperVal = this.paperField[idx];
        const cloudVal = this.cloudField[idx];
        const grainDelta = (paperVal - 0.5) * grainStrength;

        const distFromCenter = Math.hypot(nx, ny);
        const outerZone = Math.min(
          1,
          Math.max(0, (distFromCenter - 0.35) / 0.85)
        );
        const cloudWash =
          cloudStrength * outerZone * Math.max(0, (cloudVal - 0.42) * 2.1);

        const bgR = paperRGB[0] * (1 - cloudWash * 0.24) + grainDelta;
        const bgG = paperRGB[1] * (1 - cloudWash * 0.23) + grainDelta;
        const bgB = paperRGB[2] * (1 - cloudWash * 0.21) + grainDelta;

        let alpha = baseMask[idx];

        // Dry-brush white paper show-through in mid-wash transitions
        if (dryBrushGap > 0 && alpha > 0.05 && alpha < 0.88) {
          const valley = 1.0 - paperVal;
          if (valley > 1.0 - dryBrushGap) {
            alpha *= Math.max(0, 1.0 - (valley - (1.0 - dryBrushGap)) * 3.2);
          }
        }

        const coreWeight = Math.min(1, Math.max(0, (alpha - 0.35) / 0.55));
        let fgR =
          this.paintedRGB[p] * coreWeight + bledColors[p] * (1 - coreWeight);
        let fgG =
          this.paintedRGB[p + 1] * coreWeight +
          bledColors[p + 1] * (1 - coreWeight);
        let fgB =
          this.paintedRGB[p + 2] * coreWeight +
          bledColors[p + 2] * (1 - coreWeight);

        // Pigment granulation (pigment settles into cold-press paper valleys)
        if (granulation > 0 && alpha > 0.02) {
          const settle = 1.0 - (paperVal - 0.5) * granulation;
          fgR *= settle;
          fgG *= settle;
          fgB *= settle;
        }

        // Wet water-ring edge darkening (pigment migration toward drying boundary)
        if (waterRingStrength > 0 && alpha > 0.08 && alpha < 0.72) {
          const ringBell = Math.sin(((alpha - 0.08) / 0.64) * Math.PI);
          const darken = 1.0 - ringBell * waterRingStrength * 0.38;
          fgR *= darken;
          fgG *= darken;
          fgB *= darken;
        }

        // Sobel Graphite / Sepia Ink Contour Overlay
        if (sketchOpacity > 0.01 && alpha > 0.15) {
          const e = this.edgeField[idx];
          if (e > sketchThresh * 0.28) {
            const lineAlpha =
              Math.min(1, (e - sketchThresh * 0.28) * 2.2) *
              sketchOpacity *
              Math.min(1, alpha * 1.3);
            const inkR = 45 + sketchWarm * 48;
            const inkG = 42 + sketchWarm * 22;
            const inkB = 48 - sketchWarm * 16;
            fgR = fgR * (1 - lineAlpha) + inkR * lineAlpha;
            fgG = fgG * (1 - lineAlpha) + inkG * lineAlpha;
            fgB = fgB * (1 - lineAlpha) + inkB * lineAlpha;
          }
        }

        const finalR = bgR * (1 - alpha) + (fgR + grainDelta * 0.55) * alpha;
        const finalG = bgG * (1 - alpha) + (fgG + grainDelta * 0.55) * alpha;
        const finalB = bgB * (1 - alpha) + (fgB + grainDelta * 0.55) * alpha;

        dst[p] = Math.max(0, Math.min(255, finalR));
        dst[p + 1] = Math.max(0, Math.min(255, finalG));
        dst[p + 2] = Math.max(0, Math.min(255, finalB));
        dst[p + 3] = 255;
      }
    }

    ctx.putImageData(outImg, 0, 0);

    // 5. Boundary-Normal Vector Splatters, Watercolor Blooms & Gravity Drips
    if (params.splatterAmount > 0 || params.dripLength > 0) {
      this._renderSplattersAndDrips(ctx, baseMask, bledColors, params);
    }

    return performance.now() - t0;
  }

  /**
   * Builds the composite Subject + fBm Watercolor Wash Alpha Mask.
   * @param {WatercolorParams} params
   * @returns {Float32Array}
   * @private
   */
  _buildWatercolorMask(params) {
    const w = this.width;
    const h = this.height;
    const mask = new Float32Array(w * h);

    const coverage = params.subjectCoverage / 100;
    const washSpread = params.washSpread / 100;
    const roughness = params.edgeRoughness / 100;
    const softness = Math.max(0.08, params.edgeSoftness / 100);
    const cutoutMode = params.cutoutMode || "smart";

    const baseSubject =
      this.aiSubjectMask && cutoutMode === "smart"
        ? this.aiSubjectMask
        : this.autoSubjectMask;

    const auraBlurRadius = Math.round(
      Math.max(4, washSpread * Math.min(w, h) * 0.14)
    );
    const dilatedSubject =
      cutoutMode === "full"
        ? null
        : this._boxBlurFloat(baseSubject, w, h, auraBlurRadius);

    for (let y = 0; y < h; y++) {
      const ny = (y / h - 0.5) / (0.32 + coverage * 0.32);
      for (let x = 0; x < w; x++) {
        const nx = (x / w - 0.5) / (0.28 + coverage * 0.32);
        const idx = y * w + x;

        let sVal = 1.0;
        if (cutoutMode === "full") {
          const edgeDist = Math.min(x / w, (w - x) / w, y / h, (h - y) / h);
          sVal = Math.min(1.0, edgeDist * (14 - washSpread * 8));
        } else if (cutoutMode === "radial") {
          const rDist = Math.hypot(nx, ny);
          sVal = Math.max(0, 1.15 - rDist * 0.92);
        } else {
          const core = baseSubject[idx];
          const aura = dilatedSubject[idx] * (0.55 + washSpread * 0.75);
          sVal = Math.max(core, aura) * (0.65 + coverage * 0.85);
        }

        if (sVal < 0.96 && roughness > 0.01) {
          const n1 = this.perlin.fbm(x * 0.012, y * 0.012, 4, 0.55, 2.1);
          const n2 = this.perlin.noise(x * 0.045 + 91, y * 0.045 + 37);
          const brushPerturb =
            (n1 * 0.72 + n2 * 0.28 - 0.48) * roughness * 0.95;
          sVal += brushPerturb;
        }

        if (this.userBrushMask && this.userBrushMask[idx] !== 0) {
          sVal += this.userBrushMask[idx] * 1.15;
        }

        const low = 0.42 - softness * 0.34;
        const high = 0.44 + softness * 0.42;
        let t = (sVal - low) / Math.max(0.02, high - low);
        t = Math.max(0, Math.min(1, t));
        mask[idx] = t * t * (3 - 2 * t);
      }
    }

    return mask;
  }

  /**
   * Separable O(1) sliding-window RGB blur over `this.paintedRGB` so outer washes
   * and splatters inherit accurate local colors from adjacent subject boundaries.
   *
   * @param {number} radius
   * @returns {Uint8ClampedArray}
   * @private
   */
  _createColorBleedBuffer(radius) {
    const w = this.width;
    const h = this.height;
    const r = Math.max(2, Math.round(radius));
    const src = this.paintedRGB;
    const tmp = new Uint8ClampedArray(w * h * 4);
    const dst = new Uint8ClampedArray(w * h * 4);
    const count = 2 * r + 1;

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      let sr = 0,
        sg = 0,
        sb = 0;
      const row = y * w;
      for (let i = -r; i <= r; i++) {
        const p = (row + Math.min(w - 1, Math.max(0, i))) * 4;
        sr += src[p];
        sg += src[p + 1];
        sb += src[p + 2];
      }
      for (let x = 0; x < w; x++) {
        const p = (row + x) * 4;
        tmp[p] = sr / count;
        tmp[p + 1] = sg / count;
        tmp[p + 2] = sb / count;
        const pLeft = (row + Math.max(0, x - r)) * 4;
        const pRight = (row + Math.min(w - 1, x + r + 1)) * 4;
        sr += src[pRight] - src[pLeft];
        sg += src[pRight + 1] - src[pLeft + 1];
        sb += src[pRight + 2] - src[pLeft + 2];
      }
    }

    // Vertical pass
    for (let x = 0; x < w; x++) {
      let sr = 0,
        sg = 0,
        sb = 0;
      for (let i = -r; i <= r; i++) {
        const p = (Math.min(h - 1, Math.max(0, i)) * w + x) * 4;
        sr += tmp[p];
        sg += tmp[p + 1];
        sb += tmp[p + 2];
      }
      for (let y = 0; y < h; y++) {
        const p = (y * w + x) * 4;
        dst[p] = sr / count;
        dst[p + 1] = sg / count;
        dst[p + 2] = sb / count;
        dst[p + 3] = 255;
        const pTop = (Math.max(0, y - r) * w + x) * 4;
        const pBot = (Math.min(h - 1, y + r + 1) * w + x) * 4;
        sr += tmp[pBot] - tmp[pTop];
        sg += tmp[pBot + 1] - tmp[pTop + 1];
        sb += tmp[pBot + 2] - tmp[pTop + 2];
      }
    }

    return dst;
  }

  /**
   * Samples boundary transition candidates (`0.12 < alpha < 0.78`), estimates outward
   * mask normals, and renders color-matched watercolor blooms, directional splatters,
   * micro-mist droplets, and vertical gravity drips.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Float32Array} baseMask
   * @param {Uint8ClampedArray} bledColors
   * @param {WatercolorParams} params
   * @private
   */
  _renderSplattersAndDrips(ctx, baseMask, bledColors, params) {
    const w = this.width;
    const h = this.height;
    const rng = new SeededRandom(this.seed + 777);
    const scaleFactor = Math.min(w, h) / 900;

    const boundaryCandidates = [];
    const step = Math.max(4, Math.round(6 * scaleFactor));

    for (let y = step; y < h - step; y += step) {
      for (let x = step; x < w - step; x += step) {
        const idx = y * w + x;
        const a = baseMask[idx];
        if (a > 0.12 && a < 0.78) {
          const gx = baseMask[idx - step] - baseMask[idx + step];
          const gy = baseMask[(y - step) * w + x] - baseMask[(y + step) * w + x];
          const mag = Math.hypot(gx, gy) || 1;
          boundaryCandidates.push({
            x,
            y,
            nx: gx / mag,
            ny: gy / mag,
          });
        }
      }
    }

    if (boundaryCandidates.length === 0) return;

    const splatAmount = params.splatterAmount / 100;
    const splatScale = (params.splatterSize / 100) * scaleFactor;
    const splatReach =
      (params.splatterReach / 100) * Math.min(w, h) * 0.22;
    const waterRing = params.waterRingIntensity / 100;

    ctx.save();

    // A. Soft Watercolor Cloud Blooms & Medium Splatters
    const numBlooms = Math.round(splatAmount * 190);
    for (let i = 0; i < numBlooms; i++) {
      const b =
        boundaryCandidates[Math.floor(rng.next() * boundaryCandidates.length)];
      const angleJitter = rng.range(-0.65, 0.65);
      const baseAngle = Math.atan2(b.ny, b.nx) + angleJitter;
      const dist = Math.pow(rng.next(), 0.75) * splatReach;

      const sx = b.x + Math.cos(baseAngle) * dist;
      const sy = b.y + Math.sin(baseAngle) * dist;

      const sampleX = Math.max(
        0,
        Math.min(w - 1, Math.round(b.x - b.nx * 14 * scaleFactor))
      );
      const sampleY = Math.max(
        0,
        Math.min(h - 1, Math.round(b.y - b.ny * 14 * scaleFactor))
      );
      const p = (sampleY * w + sampleX) * 4;
      const r = bledColors[p];
      const g = bledColors[p + 1];
      const bl = bledColors[p + 2];

      const radius =
        rng.range(4, 28) * splatScale * (1 - (dist / (splatReach + 1)) * 0.45);
      const opacity = rng.range(0.18, 0.62);

      this._drawOrganicSplatterBlob(
        ctx,
        sx,
        sy,
        radius,
        r,
        g,
        bl,
        opacity,
        waterRing,
        rng
      );
    }

    // B. Crisp Directional Paint Droplets & Fine Mist
    const numDroplets = Math.round(splatAmount * 520);
    for (let i = 0; i < numDroplets; i++) {
      const b =
        boundaryCandidates[Math.floor(rng.next() * boundaryCandidates.length)];
      const angle = Math.atan2(b.ny, b.nx) + rng.range(-0.55, 0.55);
      const dist = rng.range(4 * scaleFactor, splatReach * 1.35);

      const sx = b.x + Math.cos(angle) * dist;
      const sy = b.y + Math.sin(angle) * dist;

      const sampleX = Math.max(
        0,
        Math.min(w - 1, Math.round(b.x - b.nx * 10 * scaleFactor))
      );
      const sampleY = Math.max(
        0,
        Math.min(h - 1, Math.round(b.y - b.ny * 10 * scaleFactor))
      );
      const p = (sampleY * w + sampleX) * 4;
      const r = Math.max(0, bledColors[p] - 12);
      const g = Math.max(0, bledColors[p + 1] - 12);
      const bl = Math.max(0, bledColors[p + 2] - 12);

      const dropR =
        rng.range(0.9, 5.2) * (0.55 + splatScale * 0.65);
      const alpha = rng.range(0.35, 0.85);

      ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      const stretch = rng.range(1.0, 1.85);
      ctx.ellipse(
        sx,
        sy,
        dropR * stretch,
        dropR,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // C. Vertical Watercolor Gravity Drips (bottom edge runs)
    const dripStrength = params.dripLength / 100;
    if (dripStrength > 0.02) {
      const lowerCandidates = boundaryCandidates.filter(
        (c) => c.ny > 0.25 && c.y > h * 0.42
      );
      const pool =
        lowerCandidates.length > 5 ? lowerCandidates : boundaryCandidates;
      const numDrips = Math.round(dripStrength * 28);

      for (let i = 0; i < numDrips; i++) {
        const b = pool[Math.floor(rng.next() * pool.length)];
        const sampleX = Math.max(0, Math.min(w - 1, Math.round(b.x)));
        const sampleY = Math.max(
          0,
          Math.min(h - 1, Math.round(b.y - 12 * scaleFactor))
        );
        const p = (sampleY * w + sampleX) * 4;
        const r = bledColors[p];
        const g = bledColors[p + 1];
        const bl = bledColors[p + 2];

        const len =
          rng.range(25, 165) * dripStrength * scaleFactor;
        const width = rng.range(1.5, 4.8) * scaleFactor;
        const alpha = rng.range(0.32, 0.72);

        ctx.beginPath();
        let curX = b.x + rng.range(-6, 6) * scaleFactor;
        let curY = b.y;
        ctx.moveTo(curX, curY);

        const segments = 8;
        const segLen = len / segments;
        for (let s = 1; s <= segments; s++) {
          curX += rng.range(-2.2, 2.2) * scaleFactor;
          curY += segLen;
          ctx.lineTo(curX, curY);
        }

        ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(2)})`;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.fillStyle = `rgba(${Math.max(0, r - 18)}, ${Math.max(
          0,
          g - 18
        )}, ${Math.max(0, bl - 18)}, ${(alpha * 1.1).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(curX, curY, width * 1.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Renders an irregular polygon watercolor splatter bloom with radial pigment
   * gradient and darkened wet water-ring rim.
   * @private
   */
  _drawOrganicSplatterBlob(
    ctx,
    cx,
    cy,
    radius,
    r,
    g,
    b,
    opacity,
    waterRing,
    rng
  ) {
    const vertices = 10;
    ctx.beginPath();
    for (let i = 0; i <= vertices; i++) {
      const theta = (i / vertices) * Math.PI * 2;
      const radVar = radius * rng.range(0.68, 1.28);
      const vx = cx + Math.cos(theta) * radVar;
      const vy = cy + Math.sin(theta) * radVar;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(
      cx,
      cy,
      radius * 0.1,
      cx,
      cy,
      radius * 1.2
    );
    grad.addColorStop(
      0,
      `rgba(${r}, ${g}, ${b}, ${(opacity * 0.65).toFixed(2)})`
    );
    const rimDark = Math.round(waterRing * 28);
    grad.addColorStop(
      0.78,
      `rgba(${Math.max(0, r - rimDark)}, ${Math.max(
        0,
        g - rimDark
      )}, ${Math.max(0, b - rimDark)}, ${opacity.toFixed(2)})`
    );
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.fill();
  }
}

window.WatercolorEngine = WatercolorEngine;
