/**
 * SplashCanvas — Core Watercolor Rendering Engine
 * Replicates professional bespoke Fiverr watercolor portrait effects:
 * 1. Anisotropic Kuwahara & Bilateral pigment brush abstraction with center/face detail fidelity
 * 2. Smart Subject Cutout (foreground saliency + border background rejection + optional AI segmentation)
 * 3. Fractal Brownian Motion (FBM) watercolor wash bleed & dry-brush rough edges
 * 4. Color-sampled directional paint splatters, blooms, micro-droplets, and vertical gravity drips
 * 5. Wet-edge pigment pooling ("water rings") & pencil/sepia ink sketch contours
 * 6. Cold-press paper tooth texture + outer grey/tinted atmospheric clouds
 */

class SeededRandom {
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
  }
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
}

class PerlinNoise2D {
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
    return (res + 1) * 0.5; // normalized [0, 1]
  }

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

class WatercolorEngine {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.seed = 2026;
    this.perlin = new PerlinNoise2D(this.seed);

    // Source image buffers
    this.srcData = null; // Uint8ClampedArray (RGBA)
    this.autoSubjectMask = null; // Float32Array [0..1]
    this.aiSubjectMask = null; // Float32Array [0..1] if MediaPipe is run
    this.userBrushMask = null; // Float32Array [-1..1] additive/subtractive brush strokes
    this.paperField = null; // Float32Array [0..1] cold-press paper heightmap
    this.cloudField = null; // Float32Array [0..1] outer atmospheric clouds
    this.edgeField = null; // Float32Array [0..1] Sobel contour strength

    // Cached intermediate buffers to make slider updates ultra-responsive
    this.paintedRGB = null; // Uint8ClampedArray (RGBX)
    this.lastPaintSignature = "";
  }

  setSeed(seed) {
    this.seed = seed;
    this.perlin = new PerlinNoise2D(seed);
    this._buildPaperAndCloudFields();
  }

  /**
   * Load source image onto internal working resolution
   */
  loadImage(imgSource, maxDimension = 1050) {
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

    this._computeEdgeField();
    this._computeSmartSubjectMask();
    this._buildPaperAndCloudFields();
  }

  /**
   * Clear user manual brush edits
   */
  clearUserBrushMask() {
    if (this.userBrushMask) {
      this.userBrushMask.fill(0);
    }
  }

  /**
   * Apply a circular soft brush stroke to the user mask
   * mode: 'restore' (+1) or 'erase' (-1)
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
   * Store external AI segmentation mask (e.g. MediaPipe SelfieSegmentation)
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
   * Compute Sobel gradient edge field for pencil/ink outlines and saliency
   */
  _computeEdgeField() {
    const w = this.width;
    const h = this.height;
    const src = this.srcData;
    const lum = new Float32Array(w * h);

    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      lum[i] = (0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2]) / 255;
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
   * Smart local subject segmentation:
   * Samples border clusters (sky, beach, wall, grass) and combines color distance,
   * skin/warmth saliency, local edge density, and portrait center prior.
   */
  _computeSmartSubjectMask() {
    const w = this.width;
    const h = this.height;
    const src = this.srcData;

    // Sample border colors across top, left, right, and outer bottom edges
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

    // Condense border samples into k representative palette centroids
    const centroids = [];
    const bucketStep = Math.max(1, Math.floor(borderSamples.length / 24));
    for (let i = 0; i < borderSamples.length; i += bucketStep) {
      centroids.push(borderSamples[i]);
    }

    // Smooth edge density map so textured subjects stay solid inside
    const localEdgeDensity = this._boxBlurFloat(this.edgeField, w, h, 14);

    const rawMask = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const ny = (y / h - 0.52) / 0.46; // slight downward shift for full-body portraits
      for (let x = 0; x < w; x++) {
        const nx = (x / w - 0.5) / 0.38;
        const idx = y * w + x;
        const p = idx * 4;
        const r = src[p];
        const g = src[p + 1];
        const b = src[p + 2];

        // Find minimum color distance to border background centroids with similar vertical zone
        let minBgDist = 1e9;
        const yFrac = y / h;
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

        // Elliptical portrait center weight
        const radialDist = Math.hypot(nx, ny);
        const centerPrior = Math.max(
          0,
          Math.min(1, 1.18 - Math.pow(radialDist, 1.65) * 0.85)
        );

        // Skin / vibrant object boost
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        const edgeScore = Math.min(1.0, localEdgeDensity[idx] * 2.8);

        // Combine cues
        let score =
          centerPrior * (0.42 + 0.48 * bgDiffScore + 0.25 * edgeScore + 0.2 * sat);

        // Protect central core where faces/torsos typically reside
        if (radialDist < 0.52 && (bgDiffScore > 0.22 || edgeScore > 0.12)) {
          score = Math.max(score, 0.88 - radialDist * 0.3);
        }

        // Strongly suppress outer frame margin
        if (x < w * 0.04 || x > w * 0.96 || y < h * 0.04 || y > h * 0.96) {
          score *= 0.15;
        }

        rawMask[idx] = Math.max(0, Math.min(1, score));
      }
    }

    // Smooth the mask so subject transitions organically
    const blurred = this._boxBlurFloat(rawMask, w, h, 18);
    this.autoSubjectMask = blurred;
  }

  /**
   * Build cold-press watercolor paper tooth heightmap and outer cloud field
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
        // Multi-scale cotton cold-press paper dimples + fine fiber grain
        const coarse = this.perlin.noise(x * 0.11, y * 0.11);
        const medium = this.perlin.noise(x * 0.31 + 17, y * 0.31 + 29);
        const fine = rng.next();
        this.paperField[idx] = coarse * 0.52 + medium * 0.33 + fine * 0.15;

        // Outer watercolor cloud blooms (like the grey clouds in 8246894C)
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
   * Fast separable box blur for Float32Array
   */
  _boxBlurFloat(src, w, h, radius) {
    if (radius <= 0) return new Float32Array(src);
    const r = Math.max(1, Math.round(radius));
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const rowOffset = y * w;
      for (let i = -r; i <= r; i++) {
        const x = Math.min(w - 1, Math.max(0, i));
        sum += src[rowOffset + x];
      }
      const count = 2 * r + 1;
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
      const count = 2 * r + 1;
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
   * Compute the painted watercolor pigment buffer (Kuwahara quadrant filter + wet smoothing + quantization)
   * Uses integral images (summed-area tables) so ANY brush radius runs in O(1) per pixel!
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
      return;
    }
    this.lastPaintSignature = sig;

    const w = this.width;
    const h = this.height;
    const src = this.srcData;
    const out = new Uint8ClampedArray(w * h * 4);

    // Build integral images for R, G, B, and Luminance + Luminance^2 for O(1) Kuwahara filter
    const gw = w + 1;
    const gh = h + 1;
    const sumR = new Float64Array(gw * gh);
    const sumG = new Float64Array(gw * gh);
    const sumB = new Float64Array(gw * gh);
    const sumL = new Float64Array(gw * gh);
    const sumL2 = new Float64Array(gw * gh);

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

    // Color grading parameters
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

        // 1. Kuwahara Quadrant Paint Filter
        if (radius > 0) {
          let bestVar = 1e18;
          const quads = [
            [Math.max(0, x - radius), Math.max(0, y - radius), x + 1, y + 1],
            [x, Math.max(0, y - radius), Math.min(w, x + radius + 1), y + 1],
            [Math.max(0, x - radius), y, x + 1, Math.min(h, y + radius + 1)],
            [x, y, Math.min(w, x + radius + 1), Math.min(h, y + radius + 1)],
          ];

          for (let q = 0; q < 4; q++) {
            const [qx0, qy0, qx1, qy1] = quads[q];
            const area = Math.max(1, (qx1 - qx0) * (qy1 - qy0));
            const meanL = rectQuery(sumL, qx0, qy0, qx1, qy1) / area;
            const meanL2 = rectQuery(sumL2, qx0, qy0, qx1, qy1) / area;
            const variance = meanL2 - meanL * meanL;
            if (variance < bestVar) {
              bestVar = variance;
              rPaint = rectQuery(sumR, qx0, qy0, qx1, qy1) / area;
              gPaint = rectQuery(sumG, qx0, qy0, qx1, qy1) / area;
              bPaint = rectQuery(sumB, qx0, qy0, qx1, qy1) / area;
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

        // 3. Preserve facial & central subject crispness (Fiverr portrait look)
        if (detailKeep > 0) {
          const centerFocus = Math.max(
            0,
            1 - Math.hypot(nx, ny) * 0.85
          );
          const edgeFocus = Math.min(1, this.edgeField[idx] * 1.8);
          const fidelityBlend = Math.min(
            0.92,
            detailKeep * (0.45 * centerFocus + 0.55 * edgeFocus)
          );
          rPaint = rPaint * (1 - fidelityBlend) + src[p] * fidelityBlend;
          gPaint = gPaint * (1 - fidelityBlend) + src[p + 1] * fidelityBlend;
          bPaint = bPaint * (1 - fidelityBlend) + src[p + 2] * fidelityBlend;
        }

        // 4. Optional Pigment Palette Quantization
        if (quantizeStrength > 0.02) {
          const step = 255 / quantLevels;
          const qr = Math.round(rPaint / step) * step;
          const qg = Math.round(gPaint / step) * step;
          const qb = Math.round(bPaint / step) * step;
          rPaint = rPaint * (1 - quantizeStrength * 0.65) + qr * (quantizeStrength * 0.65);
          gPaint = gPaint * (1 - quantizeStrength * 0.65) + qg * (quantizeStrength * 0.65);
          bPaint = bPaint * (1 - quantizeStrength * 0.65) + qb * (quantizeStrength * 0.65);
        }

        // 5. Color Grading: Warmth, Contrast, Luminosity, and Watercolor Vibrancy
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

    this.paintedRGB = out;
  }

  /**
   * Parse hex color (#f6f5f0) into [r, g, b]
   */
  _hexToRgb(hex) {
    const clean = (hex || "#f6f5f0").replace("#", "");
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  /**
   * Main Render Pipeline: Combines subject wash mask, organic FBM bleed,
   * color-sampled splatters, water-ring darkening, pencil sketch lines, and paper texture.
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
      return performance.now() - t0;
    }

    // 1. Ensure painted base layer is up to date
    this._ensurePaintedLayer(params);

    // 2. Build Base Subject + Organic Watercolor Wash Alpha Mask
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

    // 3. Create Extended Color-Bleed Buffer (so washes & splatters outside the tight silhouette carry the subject's local colors!)
    const bleedRadius = Math.max(
      4,
      Math.round((params.colorBleed / 100) * Math.min(w, h) * 0.09)
    );
    const bledColors = this._createColorBleedBuffer(bleedRadius);

    // 4. Composite Paper Stock, Outer Atmospheric Clouds, Subject Wash, Water Rings, Splatters, and Sketch Lines
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

        const paperVal = this.paperField[idx]; // [0..1]
        const cloudVal = this.cloudField[idx]; // [0..1]
        const grainDelta = (paperVal - 0.5) * grainStrength;

        // Base cold-press paper color with subtle atmospheric grey watercolor clouds (like reference image 1)
        const distFromCenter = Math.hypot(nx, ny);
        const outerZone = Math.min(1, Math.max(0, (distFromCenter - 0.35) / 0.85));
        const cloudWash =
          cloudStrength *
          outerZone *
          Math.max(0, (cloudVal - 0.42) * 2.1);

        let bgR = paperRGB[0] * (1 - cloudWash * 0.24) + grainDelta;
        let bgG = paperRGB[1] * (1 - cloudWash * 0.23) + grainDelta;
        let bgB = paperRGB[2] * (1 - cloudWash * 0.21) + grainDelta;

        // Subject + wash alpha at this pixel
        let alpha = baseMask[idx];

        // Dry-brush white paper show-through in mid-wash transitions
        if (dryBrushGap > 0 && alpha > 0.05 && alpha < 0.88) {
          const valley = 1.0 - paperVal;
          if (valley > 1.0 - dryBrushGap) {
            alpha *= Math.max(0, 1.0 - (valley - (1.0 - dryBrushGap)) * 3.2);
          }
        }

        // Blend inner sharp painted subject with outer color-bled wash
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

        // Wet water-ring edge darkening (characteristic darker pigment rim where wash meets dry paper)
        if (waterRingStrength > 0 && alpha > 0.08 && alpha < 0.72) {
          const ringBell = Math.sin(((alpha - 0.08) / 0.64) * Math.PI);
          const darken = 1.0 - ringBell * waterRingStrength * 0.38;
          fgR *= darken;
          fgG *= darken;
          fgB *= darken;
        }

        // Pencil / Sepia Ink Sketch Contour overlay inside subject region
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

        // Final composite over cold-press paper with paper grain modulation
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

    // 5. Render Vector/Procedural Paint Splatters, Watercolor Blooms & Gravity Drips sampled directly from Subject Boundary Colors!
    if (params.splatterAmount > 0 || params.dripLength > 0) {
      this._renderSplattersAndDrips(ctx, baseMask, bledColors, params);
    }

    return performance.now() - t0;
  }

  /**
   * Build the combined Subject + Fractal Watercolor Wash Mask
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

    // Select base subject map
    const baseSubject =
      this.aiSubjectMask && cutoutMode === "smart"
        ? this.aiSubjectMask
        : this.autoSubjectMask;

    // Create a dilated "aura" wash around the subject so paint splashes outward like the surfboard/couple example
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
          // Full canvas mode with subtle artistic border vignette
          const edgeDist = Math.min(
            x / w,
            (w - x) / w,
            y / h,
            (h - y) / h
          );
          sVal = Math.min(1.0, edgeDist * (14 - washSpread * 8));
        } else if (cutoutMode === "radial") {
          const rDist = Math.hypot(nx, ny);
          sVal = Math.max(0, 1.15 - rDist * 0.92);
        } else {
          // Smart subject + watercolor wash aura
          const core = baseSubject[idx];
          const aura = dilatedSubject[idx] * (0.55 + washSpread * 0.75);
          sVal = Math.max(core, aura);

          // Scale by coverage slider
          sVal = sVal * (0.65 + coverage * 0.85);
        }

        // Perturb outer wash boundary with multi-octave FBM brush noise
        if (sVal < 0.96 && roughness > 0.01) {
          const n1 = this.perlin.fbm(
            x * 0.012,
            y * 0.012,
            4,
            0.55,
            2.1
          );
          const n2 = this.perlin.noise(x * 0.045 + 91, y * 0.045 + 37);
          const brushPerturb = (n1 * 0.72 + n2 * 0.28 - 0.48) * roughness * 0.95;
          sVal += brushPerturb;
        }

        // Apply interactive user brush edits (reveal or erase)
        if (this.userBrushMask && this.userBrushMask[idx] !== 0) {
          sVal += this.userBrushMask[idx] * 1.15;
        }

        // Smoothstep transition controlled by edgeSoftness
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
   * Create a blurred color-bleed buffer so watercolor washes & splatters outside the silhouette
   * inherit vibrant local colors from the nearest subject edge (e.g. neon yellow surfboard, red top, blue jeans)
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
   * Render realistic color-matched watercolor splatters, organic blooms, fine spray droplets,
   * and vertical gravity drips around the wash boundary (matching Fiverr reference images).
   */
  _renderSplattersAndDrips(ctx, mask, bledColors, params) {
    const w = this.width;
    const h = this.height;
    const rng = new SeededRandom(this.seed + 777);

    // Collect boundary contour points where mask transitions from subject to paper
    const boundaryPoints = [];
    const stride = Math.max(3, Math.floor(Math.min(w, h) / 140));

    for (let y = stride; y < h - stride; y += stride) {
      for (let x = stride; x < w - stride; x += stride) {
        const idx = y * w + x;
        const m = mask[idx];
        if (m > 0.14 && m < 0.78) {
          // Estimate outward normal vector away from subject mask
          const gx = mask[idx - stride] - mask[idx + stride];
          const gy = mask[idx - stride * w] - mask[idx + stride * w];
          const len = Math.hypot(gx, gy) || 1;
          // Sample vibrant color slightly inside the subject
          const inX = Math.min(
            w - 1,
            Math.max(0, Math.round(x - (gx / len) * stride * 4))
          );
          const inY = Math.min(
            h - 1,
            Math.max(0, Math.round(y - (gy / len) * stride * 4))
          );
          const cp = (inY * w + inX) * 4;
          boundaryPoints.push({
            x,
            y,
            nx: gx / len,
            ny: gy / len,
            r: bledColors[cp],
            g: bledColors[cp + 1],
            b: bledColors[cp + 2],
          });
        }
      }
    }

    if (boundaryPoints.length === 0) return;

    const scaleFactor = Math.min(w, h) / 800;
    const splatDensity = params.splatterAmount / 100;
    const splatScale = (params.splatterSize / 100) * scaleFactor;
    const splatReach = (params.splatterReach / 100) * Math.min(w, h) * 0.22;
    const dripAmount = params.dripLength / 100;

    ctx.save();
    ctx.globalCompositeOperation = "multiply";

    // A. Soft Watercolor Cloud Blooms & Medium Irregular Splatters
    const numBlooms = Math.floor(splatDensity * 210);
    for (let i = 0; i < numBlooms; i++) {
      const bp =
        boundaryPoints[Math.floor(rng.next() * boundaryPoints.length)];
      const angleJitter = rng.range(-0.65, 0.65);
      const baseAngle = Math.atan2(bp.ny, bp.nx) + angleJitter;
      const dist = Math.pow(rng.next(), 0.75) * splatReach;

      const sx = bp.x + Math.cos(baseAngle) * dist;
      const sy = bp.y + Math.sin(baseAngle) * dist;
      const radius = rng.range(4, 34) * (0.45 + splatScale * 1.15);
      const alpha = rng.range(0.14, 0.52) * (1 - (dist / (splatReach + 1)) * 0.45);

      this._drawOrganicBlob(
        ctx,
        sx,
        sy,
        radius,
        bp.r,
        bp.g,
        bp.b,
        alpha,
        rng
      );
    }

    // B. Crisp Fine Paint Droplets & Directional Streaks
    ctx.globalCompositeOperation = "source-over";
    const numDroplets = Math.floor(splatDensity * 420);
    for (let i = 0; i < numDroplets; i++) {
      const bp =
        boundaryPoints[Math.floor(rng.next() * boundaryPoints.length)];
      const angle = Math.atan2(bp.ny, bp.nx) + rng.range(-0.8, 0.8);
      const dist = rng.range(4, splatReach * 1.35);

      const dx = bp.x + Math.cos(angle) * dist;
      const dy = bp.y + Math.sin(angle) * dist;
      const rad = rng.range(1.1, 5.8) * (0.5 + splatScale * 0.9);
      const alpha = rng.range(0.25, 0.78);

      ctx.fillStyle = `rgba(${bp.r}, ${bp.g}, ${bp.b}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      // Slightly elongated droplet along flight direction
      const stretch = rng.range(1.0, 2.1);
      ctx.ellipse(dx, dy, rad * stretch, rad, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    // C. Lower Gravity Watercolor Drips & Runs (like the yellow surfboard bottom drips in reference)
    if (dripAmount > 0.02) {
      const lowerPoints = boundaryPoints.filter(
        (pt) => pt.y > h * 0.48 && pt.ny > 0.15
      );
      const pool = lowerPoints.length > 5 ? lowerPoints : boundaryPoints;
      const numDrips = Math.floor(dripAmount * 32);

      for (let i = 0; i < numDrips; i++) {
        const bp = pool[Math.floor(rng.next() * pool.length)];
        const dripLen =
          rng.range(18, 125) * dripAmount * scaleFactor;
        const dripWidth = rng.range(2.2, 8.5) * (0.6 + splatScale * 0.7);
        const startX = bp.x + rng.range(-10, 10);
        const startY = bp.y - rng.range(2, 12);

        const grad = ctx.createLinearGradient(
          startX,
          startY,
          startX,
          startY + dripLen
        );
        grad.addColorStop(0, `rgba(${bp.r}, ${bp.g}, ${bp.b}, 0.55)`);
        grad.addColorStop(0.75, `rgba(${bp.r}, ${bp.g}, ${bp.b}, 0.32)`);
        grad.addColorStop(1, `rgba(${bp.r}, ${bp.g}, ${bp.b}, 0.0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = dripWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(startX, startY);

        let curX = startX;
        const steps = 6;
        for (let s = 1; s <= steps; s++) {
          curX += rng.range(-2.2, 2.2);
          const curY = startY + (dripLen * s) / steps;
          ctx.lineTo(curX, curY);
        }
        ctx.stroke();

        // Terminal tear-drop bead at bottom of drip
        if (rng.next() > 0.35) {
          ctx.fillStyle = `rgba(${bp.r}, ${bp.g}, ${bp.b}, 0.42)`;
          ctx.beginPath();
          ctx.arc(
            curX,
            startY + dripLen * 0.92,
            dripWidth * 0.75,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Draw an irregular watercolor bloom polygon with wet edge ring
   */
  _drawOrganicBlob(ctx, cx, cy, radius, r, g, b, alpha, rng) {
    const vertices = 9;
    ctx.beginPath();
    for (let i = 0; i <= vertices; i++) {
      const theta = (i / vertices) * Math.PI * 2;
      const rVar = radius * rng.range(0.58, 1.32);
      const px = cx + Math.cos(theta) * rVar;
      const py = cy + Math.sin(theta) * rVar;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.25);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.7).toFixed(3)})`);
    grad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.fill();
  }
}

window.WatercolorEngine = WatercolorEngine;
