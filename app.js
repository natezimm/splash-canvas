/**
 * @fileoverview SplashCanvas Studio Application Controller (`app.js`)
 *
 * Responsibilities:
 * - Curated free-to-use Unsplash reference photograph gallery (`SAMPLE_CATALOG`)
 *   with CORS-enabled loading, photographer attribution, and automatic offline
 *   procedural fallback synthesis.
 * - 8 studio watercolor style presets (`PRESETS`) with pigment swatch metadata.
 * - Bounded 25-step Undo/Redo state history (`HistoryManager`) covering parameter
 *   adjustments, preset changes, seed re-rolls, and manual mask brush strokes.
 * - Real-time UI synchronization: CSS active slider progress fills, double-click
 *   single-parameter reset, per-section reset, live parameter search filtering,
 *   keyboard shortcuts (`1-4`, `Space`, `[/]`, `R`, `Cmd/Ctrl+Z`, `?`), and
 *   multi-scale PNG export (`1x`, `1.5x`, `2x`).
 */

/**
 * Curated free-to-use high-resolution Unsplash reference photographs.
 * Served via `images.unsplash.com` with `Access-Control-Allow-Origin: *`
 * for zero-taint HTML5 Canvas pixel manipulation.
 */
const SAMPLE_CATALOG = Object.freeze({
  portrait: {
    id: "portrait",
    title: "Expressive Studio Portrait",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=85",
    photographer: "Aiony Haust",
    photographerUrl: "https://unsplash.com/photos/7YVZYZeITc8",
    recommendedPreset: "fiverr-classic",
  },
  pet: {
    id: "pet",
    title: "Golden Retriever Outdoors",
    url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1080&q=85",
    photographer: "Berkay Gumustekin",
    photographerUrl: "https://unsplash.com/photos/ngqyo2AYYnE",
    recommendedPreset: "fiverr-classic",
  },
  surfers: {
    id: "surfers",
    title: "Coastal Surfer & Ocean Spray",
    url: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1080&q=85",
    photographer: "Jeremy Bishop",
    photographerUrl: "https://unsplash.com/photos/pikyGuAmwpM",
    recommendedPreset: "expressive-splash",
  },
  architecture: {
    id: "architecture",
    title: "Venetian Canal Architecture",
    url: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1080&q=85",
    photographer: "Damiano Baschiera",
    photographerUrl: "https://unsplash.com/photos/hFXZ5cNfkOk",
    recommendedPreset: "ink-and-wash",
  },
});

/**
 * Studio Watercolor Presets.
 */
const PRESETS = Object.freeze([
  {
    id: "fiverr-classic",
    name: "Bespoke Portrait",
    desc: "Crisp subject cutout + color-matched splatters",
    swatches: ["#38bdf8", "#f43f5e", "#facc15"],
    params: {
      brushRadius: 4,
      wetSmoothness: 45,
      detailFidelity: 72,
      colorSimplification: 18,
      pigmentGranulation: 35,
      subjectCoverage: 58,
      washSpread: 65,
      edgeRoughness: 74,
      edgeSoftness: 52,
      waterRingIntensity: 55,
      splatterAmount: 72,
      splatterSize: 55,
      splatterReach: 68,
      dripLength: 48,
      colorBleed: 82,
      sketchIntensity: 26,
      sketchDetail: 62,
      sketchWarmth: 35,
      paperGrain: 58,
      outerCloudWash: 15,
      paperShowThrough: 22,
      vibrancy: 32,
      luminosity: 18,
      contrast: 14,
      warmth: 8,
      cutoutMode: "smart",
      paperTint: "#f6f5f0",
    },
  },
  {
    id: "cloud-storybook",
    name: "Atmospheric Cloud",
    desc: "Soft grey watercolor clouds around subject",
    swatches: ["#94a3b8", "#60a5fa", "#cbd5e1"],
    params: {
      brushRadius: 4,
      wetSmoothness: 50,
      detailFidelity: 70,
      colorSimplification: 22,
      pigmentGranulation: 42,
      subjectCoverage: 56,
      washSpread: 68,
      edgeRoughness: 78,
      edgeSoftness: 58,
      waterRingIntensity: 62,
      splatterAmount: 75,
      splatterSize: 60,
      splatterReach: 72,
      dripLength: 52,
      colorBleed: 85,
      sketchIntensity: 24,
      sketchDetail: 58,
      sketchWarmth: 30,
      paperGrain: 68,
      outerCloudWash: 78,
      paperShowThrough: 26,
      vibrancy: 28,
      luminosity: 14,
      contrast: 15,
      warmth: 4,
      cutoutMode: "smart",
      paperTint: "#f6f5f0",
    },
  },
  {
    id: "ink-and-wash",
    name: "Line & Wash",
    desc: "Architectural & portrait ink contour + glaze",
    swatches: ["#fbbf24", "#78350f", "#38bdf8"],
    params: {
      brushRadius: 5,
      wetSmoothness: 55,
      detailFidelity: 65,
      colorSimplification: 30,
      pigmentGranulation: 40,
      subjectCoverage: 62,
      washSpread: 55,
      edgeRoughness: 68,
      edgeSoftness: 45,
      waterRingIntensity: 68,
      splatterAmount: 55,
      splatterSize: 45,
      splatterReach: 55,
      dripLength: 35,
      colorBleed: 70,
      sketchIntensity: 78,
      sketchDetail: 76,
      sketchWarmth: 65,
      paperGrain: 65,
      outerCloudWash: 30,
      paperShowThrough: 32,
      vibrancy: 22,
      luminosity: 16,
      contrast: 20,
      warmth: 14,
      cutoutMode: "smart",
      paperTint: "#f3efe6",
    },
  },
  {
    id: "expressive-splash",
    name: "Expressive Splash",
    desc: "Bold pigment bursts, heavy drips & high energy",
    swatches: ["#ec4899", "#8b5cf6", "#06b6d4"],
    params: {
      brushRadius: 6,
      wetSmoothness: 60,
      detailFidelity: 58,
      colorSimplification: 28,
      pigmentGranulation: 50,
      subjectCoverage: 54,
      washSpread: 82,
      edgeRoughness: 92,
      edgeSoftness: 48,
      waterRingIntensity: 75,
      splatterAmount: 98,
      splatterSize: 78,
      splatterReach: 92,
      dripLength: 85,
      colorBleed: 95,
      sketchIntensity: 32,
      sketchDetail: 60,
      sketchWarmth: 20,
      paperGrain: 62,
      outerCloudWash: 40,
      paperShowThrough: 38,
      vibrancy: 48,
      luminosity: 15,
      contrast: 22,
      warmth: 6,
      cutoutMode: "smart",
      paperTint: "#f6f5f0",
    },
  },
  {
    id: "dreamy-pastel",
    name: "Soft Pastel Glaze",
    desc: "Airy bridal & baby wash with gentle bloom",
    swatches: ["#f9a8d4", "#c4b5fd", "#fde68a"],
    params: {
      brushRadius: 5,
      wetSmoothness: 72,
      detailFidelity: 68,
      colorSimplification: 15,
      pigmentGranulation: 22,
      subjectCoverage: 60,
      washSpread: 74,
      edgeRoughness: 64,
      edgeSoftness: 78,
      waterRingIntensity: 30,
      splatterAmount: 42,
      splatterSize: 50,
      splatterReach: 60,
      dripLength: 18,
      colorBleed: 88,
      sketchIntensity: 14,
      sketchDetail: 50,
      sketchWarmth: 70,
      paperGrain: 48,
      outerCloudWash: 20,
      paperShowThrough: 35,
      vibrancy: 12,
      luminosity: 32,
      contrast: -8,
      warmth: 16,
      cutoutMode: "smart",
      paperTint: "#f7eee8",
    },
  },
  {
    id: "dry-brush-atelier",
    name: "Dry-Brush Atelier",
    desc: "Heavy cotton rag tooth with broken brush edges",
    swatches: ["#d97706", "#059669", "#dc2626"],
    params: {
      brushRadius: 7,
      wetSmoothness: 30,
      detailFidelity: 52,
      colorSimplification: 42,
      pigmentGranulation: 75,
      subjectCoverage: 58,
      washSpread: 50,
      edgeRoughness: 88,
      edgeSoftness: 32,
      waterRingIntensity: 80,
      splatterAmount: 48,
      splatterSize: 42,
      splatterReach: 50,
      dripLength: 25,
      colorBleed: 65,
      sketchIntensity: 45,
      sketchDetail: 68,
      sketchWarmth: 80,
      paperGrain: 88,
      outerCloudWash: 35,
      paperShowThrough: 65,
      vibrancy: 18,
      luminosity: 10,
      contrast: 24,
      warmth: 18,
      cutoutMode: "smart",
      paperTint: "#ede6d6",
    },
  },
  {
    id: "full-scene-aquarelle",
    name: "Full-Bleed Scene",
    desc: "Paints the entire photograph edge-to-edge",
    swatches: ["#10b981", "#3b82f6", "#f59e0b"],
    params: {
      brushRadius: 5,
      wetSmoothness: 55,
      detailFidelity: 60,
      colorSimplification: 25,
      pigmentGranulation: 45,
      subjectCoverage: 85,
      washSpread: 40,
      edgeRoughness: 65,
      edgeSoftness: 45,
      waterRingIntensity: 45,
      splatterAmount: 30,
      splatterSize: 45,
      splatterReach: 40,
      dripLength: 15,
      colorBleed: 60,
      sketchIntensity: 38,
      sketchDetail: 65,
      sketchWarmth: 45,
      paperGrain: 65,
      outerCloudWash: 10,
      paperShowThrough: 20,
      vibrancy: 35,
      luminosity: 14,
      contrast: 16,
      warmth: 10,
      cutoutMode: "full",
      paperTint: "#f3efe6",
    },
  },
  {
    id: "botanical-vintage",
    name: "Botanical Sepia",
    desc: "Warm archival undertones & delicate washes",
    swatches: ["#a16207", "#65a30d", "#d6d3d1"],
    params: {
      brushRadius: 4,
      wetSmoothness: 52,
      detailFidelity: 74,
      colorSimplification: 28,
      pigmentGranulation: 55,
      subjectCoverage: 60,
      washSpread: 62,
      edgeRoughness: 70,
      edgeSoftness: 55,
      waterRingIntensity: 72,
      splatterAmount: 58,
      splatterSize: 48,
      splatterReach: 58,
      dripLength: 38,
      colorBleed: 75,
      sketchIntensity: 52,
      sketchDetail: 70,
      sketchWarmth: 90,
      paperGrain: 76,
      outerCloudWash: 50,
      paperShowThrough: 28,
      vibrancy: 8,
      luminosity: 12,
      contrast: 18,
      warmth: 28,
      cutoutMode: "radial",
      paperTint: "#ede6d6",
    },
  },
]);

/**
 * Bounded Undo/Redo State Stack for non-destructive studio editing.
 */
class HistoryManager {
  /**
   * @param {number} [maxDepth=25]
   */
  constructor(maxDepth = 25) {
    this.maxDepth = maxDepth;
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Pushes a state snapshot onto the undo stack and clears the redo stack.
   * @param {Object} snapshot
   */
  push(snapshot) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }

  /**
   * @param {Object} currentState
   * @returns {Object|null}
   */
  undo(currentState) {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(currentState);
    return this.undoStack.pop();
  }

  /**
   * @param {Object} currentState
   * @returns {Object|null}
   */
  redo(currentState) {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(currentState);
    return this.redoStack.pop();
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}

/**
 * Main Studio UI Controller.
 */
class SplashCanvasApp {
  constructor() {
    this.engine = new WatercolorEngine();
    this.history = new HistoryManager(25);
    this.currentPresetId = PRESETS[0].id;
    this.params = { ...PRESETS[0].params };
    this.viewMode = "result"; // 'result' | 'split' | 'original' | 'mask'
    this.isPeekingOriginal = false;
    this.brushMode = "none";  // 'none' | 'restore' | 'erase'
    this.brushSize = 65;
    this.brushSoftness = 75;
    this.zoom = 1.0;
    this.splitPos = 0.5;
    this.currentImageElement = null;
    this.currentSampleId = "portrait";
    this.renderPending = false;
    this._sliderPreDragState = null;

    this._cacheDOM();
    this._buildPresetCards();
    this._bindEvents();
    this._syncUIFromParams();

    // Load default real free-to-use photograph from Unsplash ("portrait")
    this.loadSampleScene("portrait", false);
  }

  _cacheDOM() {
    this.outputCanvas = document.getElementById("output-canvas");
    this.originalOverlayCanvas = document.getElementById("original-overlay-canvas");
    this.canvasContainer = document.getElementById("canvas-container");
    this.canvasViewport = document.getElementById("canvas-viewport");
    this.presetGrid = document.getElementById("preset-grid");
    this.renderTimeLabel = document.getElementById("render-time-label");
    this.statusDot = document.getElementById("status-dot");
    this.seedReadout = document.getElementById("seed-readout");
    this.splitSlider = document.getElementById("split-slider");
    this.brushCursor = document.getElementById("brush-cursor");
    this.dropOverlay = document.getElementById("drop-overlay");
    this.fileInput = document.getElementById("file-input");
    this.sampleMenuBtn = document.getElementById("sample-menu-btn");
    this.sampleMenu = document.getElementById("sample-menu");
    this.aiStatusBadge = document.getElementById("ai-status-badge");
    this.paperNameLabel = document.getElementById("paper-name-label");
    this.photoCredit = document.getElementById("photo-credit");
    this.undoBtn = document.getElementById("undo-btn");
    this.redoBtn = document.getElementById("redo-btn");
    this.holdCompareBtn = document.getElementById("hold-compare-btn");
    this.paramSearchInput = document.getElementById("param-search-input");
    this.shortcutsModal = document.getElementById("shortcuts-modal");
    this.toastContainer = document.getElementById("toast-container");
  }

  _buildPresetCards() {
    this.presetGrid.innerHTML = "";
    PRESETS.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `preset-card ${
        preset.id === this.currentPresetId ? "active" : ""
      }`;
      btn.dataset.presetId = preset.id;
      const dotsHtml = (preset.swatches || [])
        .map(
          (c) => `<span class="preset-swatch-dot" style="background:${c}"></span>`
        )
        .join("");

      btn.innerHTML = `
        <div class="preset-top">
          <span class="preset-name">${preset.name}</span>
          <span class="preset-swatches">${dotsHtml}</span>
        </div>
        <div class="preset-desc">${preset.desc}</div>
      `;
      btn.addEventListener("click", () => {
        this._recordHistorySnapshot();
        this.applyPreset(preset.id);
        this.showToast(`Applied "${preset.name}" preset`);
      });
      this.presetGrid.appendChild(btn);
    });
  }

  /**
   * Captures current parameter & brush state for Undo/Redo.
   * @returns {Object}
   */
  _captureStateSnapshot() {
    return {
      presetId: this.currentPresetId,
      params: { ...this.params },
      seed: this.engine.seed,
      brushMask: this.engine.cloneUserBrushMask(),
    };
  }

  _recordHistorySnapshot() {
    this.history.push(this._captureStateSnapshot());
    this._updateHistoryButtons();
  }

  _applyStateSnapshot(snapshot) {
    if (!snapshot) return;
    this.currentPresetId = snapshot.presetId;
    this.params = { ...snapshot.params };
    if (snapshot.seed !== this.engine.seed) {
      this.engine.setSeed(snapshot.seed);
      this.seedReadout.textContent = `#${snapshot.seed}`;
    }
    this.engine.restoreUserBrushMask(snapshot.brushMask);
    document.querySelectorAll(".preset-card").forEach((el) => {
      el.classList.toggle("active", el.dataset.presetId === this.currentPresetId);
    });
    this._syncUIFromParams();
    this._updateHistoryButtons();
    this.scheduleRender();
  }

  _updateHistoryButtons() {
    if (this.undoBtn) {
      this.undoBtn.disabled = this.history.undoStack.length === 0;
    }
    if (this.redoBtn) {
      this.redoBtn.disabled = this.history.redoStack.length === 0;
    }
  }

  undo() {
    const prev = this.history.undo(this._captureStateSnapshot());
    if (prev) {
      this._applyStateSnapshot(prev);
      this.showToast("Undid last action");
    }
  }

  redo() {
    const next = this.history.redo(this._captureStateSnapshot());
    if (next) {
      this._applyStateSnapshot(next);
      this.showToast("Redid action");
    }
  }

  applyPreset(presetId) {
    const found = PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    this.currentPresetId = found.id;
    this.params = { ...found.params };

    document.querySelectorAll(".preset-card").forEach((el) => {
      el.classList.toggle("active", el.dataset.presetId === presetId);
    });

    this._syncUIFromParams();
    this.scheduleRender();
  }

  _syncUIFromParams() {
    document.querySelectorAll("input[data-param]").forEach((input) => {
      const key = input.dataset.param;
      if (this.params[key] !== undefined) {
        input.value = this.params[key];
        this._updateSliderLabel(key, this.params[key]);
        this._updateRangeFillProgress(input);
      }
    });

    // Cutout mode buttons
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.dataset.cutout === this.params.cutoutMode
      );
    });

    // Paper tint swatches
    let activePaperName = "Cold-Press White";
    document.querySelectorAll(".swatch").forEach((sw) => {
      const isMatch =
        sw.dataset.tint.toLowerCase() ===
        (this.params.paperTint || "#f6f5f0").toLowerCase();
      sw.classList.toggle("active", isMatch);
      if (isMatch && sw.dataset.name) {
        activePaperName = sw.dataset.name;
      }
    });
    if (this.paperNameLabel) {
      this.paperNameLabel.textContent = activePaperName;
    }

    // Also update brush size/softness slider fills
    const brushSizeInput = document.getElementById("brush-size");
    const brushSoftInput = document.getElementById("brush-softness");
    if (brushSizeInput) this._updateRangeFillProgress(brushSizeInput);
    if (brushSoftInput) this._updateRangeFillProgress(brushSoftInput);
  }

  /**
   * Updates the `--fill-pct` CSS custom property on a range input so its
   * active track gradient matches the thumb position.
   * @param {HTMLInputElement} input
   */
  _updateRangeFillProgress(input) {
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const val = parseFloat(input.value) || 0;
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    input.style.setProperty("--fill-pct", `${pct.toFixed(1)}%`);
  }

  _updateSliderLabel(param, value) {
    const label = document.getElementById(`val-${param}`);
    if (!label) return;
    if (param === "brushRadius") {
      label.textContent = `${value}px`;
    } else if (
      ["vibrancy", "luminosity", "contrast", "warmth"].includes(param) &&
      Number(value) > 0
    ) {
      label.textContent = `+${value}%`;
    } else {
      label.textContent = `${value}%`;
    }
  }

  /**
   * Resets a single parameter back to the active preset's default value.
   * @param {string} paramKey
   */
  resetSingleParameter(paramKey) {
    const activePreset =
      PRESETS.find((p) => p.id === this.currentPresetId) || PRESETS[0];
    if (activePreset.params[paramKey] === undefined) return;
    const defaultVal = activePreset.params[paramKey];
    if (this.params[paramKey] === defaultVal) return;

    this._recordHistorySnapshot();
    this.params[paramKey] = defaultVal;
    this._syncUIFromParams();
    this.scheduleRender();
    this.showToast(`Reset ${paramKey} to ${defaultVal}`);
  }

  /**
   * Resets all parameters belonging to a specific control group (`brush`, `wash`, `splatter`, `sketch`, `paper`, `grading`).
   * @param {string} groupName
   */
  resetParameterGroup(groupName) {
    const activePreset =
      PRESETS.find((p) => p.id === this.currentPresetId) || PRESETS[0];
    const groupInputs = document.querySelectorAll(
      `input[data-param][data-group="${groupName}"]`
    );
    if (!groupInputs.length) return;

    this._recordHistorySnapshot();
    groupInputs.forEach((input) => {
      const key = input.dataset.param;
      if (activePreset.params[key] !== undefined) {
        this.params[key] = activePreset.params[key];
      }
    });
    this._syncUIFromParams();
    this.scheduleRender();
    this.showToast(`Reset ${groupName} section to preset defaults`);
  }

  _bindEvents() {
    // Slider inputs: record history on pointerdown, live-render on input, double-click to reset
    document.querySelectorAll("input[data-param]").forEach((input) => {
      input.addEventListener("pointerdown", () => {
        this._sliderPreDragState = this._captureStateSnapshot();
      });

      input.addEventListener("change", () => {
        if (this._sliderPreDragState) {
          this.history.push(this._sliderPreDragState);
          this._sliderPreDragState = null;
          this._updateHistoryButtons();
        }
      });

      input.addEventListener("input", (e) => {
        const key = e.target.dataset.param;
        const val = parseFloat(e.target.value);
        this.params[key] = val;
        this._updateSliderLabel(key, val);
        this._updateRangeFillProgress(e.target);
        this.scheduleRender();
      });

      input.addEventListener("dblclick", (e) => {
        this.resetSingleParameter(e.target.dataset.param);
      });

      const row = input.closest(".control-row");
      if (row) {
        const lbl = row.querySelector("label");
        if (lbl) {
          lbl.title = "Double-click to reset parameter to preset default";
          lbl.addEventListener("dblclick", (e) => {
            e.preventDefault();
            this.resetSingleParameter(input.dataset.param);
          });
        }
      }
    });

    // Per-section Reset buttons inside <summary>
    document.querySelectorAll(".group-reset-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetParameterGroup(btn.dataset.resetGroup);
      });
    });

    // Parameter Filter / Search bar
    if (this.paramSearchInput) {
      this.paramSearchInput.addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll(".control-group").forEach((group) => {
          let visibleCount = 0;
          group.querySelectorAll(".control-row").forEach((row) => {
            const haystack = (
              (row.dataset.label || "") +
              " " +
              row.textContent
            ).toLowerCase();
            const match = !q || haystack.includes(q);
            row.classList.toggle("hidden", !match);
            if (match) visibleCount++;
          });
          group.classList.toggle("hidden", visibleCount === 0);
          if (q && visibleCount > 0) {
            group.setAttribute("open", "");
          }
        });
      });
    }

    // Cutout Mode buttons
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._recordHistorySnapshot();
        this.params.cutoutMode = btn.dataset.cutout;
        document
          .querySelectorAll(".mode-btn")
          .forEach((b) => b.classList.toggle("active", b === btn));
        this.scheduleRender();
      });
    });

    // Paper Tint Swatches
    document.querySelectorAll(".swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        this._recordHistorySnapshot();
        this.params.paperTint = sw.dataset.tint;
        if (this.paperNameLabel && sw.dataset.name) {
          this.paperNameLabel.textContent = sw.dataset.name;
        }
        document
          .querySelectorAll(".swatch")
          .forEach((s) => s.classList.toggle("active", s === sw));
        this.scheduleRender();
      });
    });

    // View Toggles (Artwork, Split, Original, Mask)
    document.querySelectorAll(".pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setViewMode(btn.dataset.view);
      });
    });

    // Hold to Peek Original button
    if (this.holdCompareBtn) {
      const startPeek = () => {
        if (this.isPeekingOriginal) return;
        this.isPeekingOriginal = true;
        this.holdCompareBtn.classList.add("peeking");
        this.scheduleRender();
      };
      const endPeek = () => {
        if (!this.isPeekingOriginal) return;
        this.isPeekingOriginal = false;
        this.holdCompareBtn.classList.remove("peeking");
        this.scheduleRender();
      };
      this.holdCompareBtn.addEventListener("pointerdown", startPeek);
      window.addEventListener("pointerup", endPeek);
      this.holdCompareBtn.addEventListener("pointerleave", endPeek);
    }

    // Brush Mode Buttons
    document.querySelectorAll(".brush-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.brushMode = btn.dataset.brush;
        document
          .querySelectorAll(".brush-btn")
          .forEach((b) => b.classList.toggle("active", b === btn));
        if (this.brushMode === "none") {
          this.brushCursor.classList.add("hidden");
        }
      });
    });

    // Brush size & softness sliders
    const brushSizeInput = document.getElementById("brush-size");
    const brushSoftInput = document.getElementById("brush-softness");
    brushSizeInput.addEventListener("input", (e) => {
      this.brushSize = parseInt(e.target.value, 10);
      document.getElementById("val-brush-size").textContent = `${this.brushSize}px`;
      this._updateRangeFillProgress(e.target);
    });
    brushSoftInput.addEventListener("input", (e) => {
      this.brushSoftness = parseInt(e.target.value, 10);
      document.getElementById("val-brush-softness").textContent = `${this.brushSoftness}%`;
      this._updateRangeFillProgress(e.target);
    });

    document.getElementById("clear-brush-btn").addEventListener("click", () => {
      this._recordHistorySnapshot();
      this.engine.clearUserBrushMask();
      this.scheduleRender();
      this.showToast("Cleared manual brush mask edits");
    });

    // Interactive Painting on Canvas
    let isPainting = false;
    const handleCanvasPointer = (e, paintNow) => {
      const rect = this.outputCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.brushMode !== "none") {
        this.brushCursor.classList.remove("hidden");
        const displayRadius =
          (this.brushSize / this.engine.width) * rect.width * 2;
        this.brushCursor.style.width = `${displayRadius}px`;
        this.brushCursor.style.height = `${displayRadius}px`;
        this.brushCursor.style.left = `${x}px`;
        this.brushCursor.style.top = `${y}px`;
        this.brushCursor.style.borderColor =
          this.brushMode === "restore"
            ? "rgba(52, 211, 153, 0.95)"
            : "rgba(248, 113, 113, 0.95)";

        if (paintNow) {
          const normX = Math.max(0, Math.min(1, x / rect.width));
          const normY = Math.max(0, Math.min(1, y / rect.height));
          this.engine.applyBrushStroke(
            normX,
            normY,
            this.brushSize,
            this.brushSoftness,
            this.brushMode
          );
          this.scheduleRender();
        }
      }
    };

    this.canvasContainer.addEventListener("pointerdown", (e) => {
      if (this.brushMode !== "none") {
        this._recordHistorySnapshot();
        isPainting = true;
        handleCanvasPointer(e, true);
      }
    });
    window.addEventListener("pointermove", (e) => {
      handleCanvasPointer(e, isPainting);
    });
    window.addEventListener("pointerup", () => {
      isPainting = false;
    });
    this.canvasContainer.addEventListener("pointerleave", () => {
      if (!isPainting) this.brushCursor.classList.add("hidden");
    });

    // Split Comparison Slider Dragging
    let isDraggingSplit = false;
    this.splitSlider.addEventListener("pointerdown", (e) => {
      isDraggingSplit = true;
      e.stopPropagation();
    });
    window.addEventListener("pointermove", (e) => {
      if (!isDraggingSplit) return;
      const rect = this.outputCanvas.getBoundingClientRect();
      this.splitPos = Math.max(
        0.02,
        Math.min(0.98, (e.clientX - rect.left) / rect.width)
      );
      this._updateSplitClip();
    });
    window.addEventListener("pointerup", () => {
      isDraggingSplit = false;
    });

    // File Upload & Drag-and-Drop
    this.fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadUserFile(e.target.files[0]);
      }
    });

    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropOverlay.classList.remove("hidden");
    });
    this.dropOverlay.addEventListener("dragleave", () => {
      this.dropOverlay.classList.add("hidden");
    });
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropOverlay.classList.add("hidden");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.loadUserFile(e.dataTransfer.files[0]);
      }
    });

    // Sample Photos Menu
    this.sampleMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = this.sampleMenu.classList.toggle("open");
      this.sampleMenuBtn.setAttribute("aria-expanded", String(isOpen));
    });
    window.addEventListener("click", () => {
      this.sampleMenu.classList.remove("open");
      this.sampleMenuBtn.setAttribute("aria-expanded", "false");
    });
    this.sampleMenu.querySelectorAll("button[data-sample]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.loadSampleScene(btn.dataset.sample, true);
      });
    });

    // Undo / Redo / Seed / Reset / Export
    if (this.undoBtn) {
      this.undoBtn.addEventListener("click", () => this.undo());
    }
    if (this.redoBtn) {
      this.redoBtn.addEventListener("click", () => this.redo());
    }

    const rerollSeed = () => {
      this._recordHistorySnapshot();
      const nextSeed = Math.floor(Math.random() * 90000) + 1000;
      this.engine.setSeed(nextSeed);
      this.seedReadout.textContent = `#${nextSeed}`;
      this.scheduleRender();
      this.showToast(`Re-rolled splatter seed (#${nextSeed})`);
    };

    document
      .getElementById("randomize-seed-btn")
      .addEventListener("click", rerollSeed);
    document
      .getElementById("seed-pill-btn")
      .addEventListener("click", rerollSeed);

    document.getElementById("reset-all-btn").addEventListener("click", () => {
      this._recordHistorySnapshot();
      this.engine.clearUserBrushMask();
      this.applyPreset(this.currentPresetId);
      this.showToast("Reset all parameters to preset defaults");
    });

    document.getElementById("export-btn").addEventListener("click", () => {
      this.exportArtwork();
    });

    document.getElementById("ai-cutout-btn").addEventListener("click", () => {
      this.runMediaPipeCutout();
    });

    // Collapse / Expand All right-hand sections button
    const toggleSectionsBtn = document.getElementById("toggle-sections-btn");
    if (toggleSectionsBtn) {
      toggleSectionsBtn.addEventListener("click", () => {
        const groups = Array.from(document.querySelectorAll(".control-group"));
        const anyOpen = groups.some((g) => g.hasAttribute("open"));
        groups.forEach((g) => {
          if (anyOpen) g.removeAttribute("open");
          else g.setAttribute("open", "");
        });
        toggleSectionsBtn.textContent = anyOpen ? "Expand All" : "Collapse All";
      });
    }

    // Zoom Controls & Wheel Zoom
    document.getElementById("zoom-in-btn").addEventListener("click", () => {
      this.setZoom(Math.min(2.5, this.zoom + 0.2));
    });
    document.getElementById("zoom-out-btn").addEventListener("click", () => {
      this.setZoom(Math.max(0.5, this.zoom - 0.2));
    });
    document.getElementById("zoom-fit-btn").addEventListener("click", () => {
      this.setZoom(1.0);
    });

    this.canvasViewport.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.12 : -0.12;
          this.setZoom(Math.max(0.5, Math.min(2.5, this.zoom + delta)));
        }
      },
      { passive: false }
    );

    // Shortcuts Modal
    const shortcutsBtn = document.getElementById("shortcuts-btn");
    const closeShortcutsBtn = document.getElementById("close-shortcuts-btn");
    if (shortcutsBtn && this.shortcutsModal) {
      shortcutsBtn.addEventListener("click", () => {
        this.shortcutsModal.classList.remove("hidden");
      });
      closeShortcutsBtn.addEventListener("click", () => {
        this.shortcutsModal.classList.add("hidden");
      });
      this.shortcutsModal.addEventListener("click", (e) => {
        if (e.target === this.shortcutsModal) {
          this.shortcutsModal.classList.add("hidden");
        }
      });
    }

    // Global Studio Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") e.target.blur();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        this.isPeekingOriginal = true;
        if (this.holdCompareBtn) this.holdCompareBtn.classList.add("peeking");
        this.scheduleRender();
        return;
      }

      if (e.key === "1") this.setViewMode("result");
      else if (e.key === "2") this.setViewMode("split");
      else if (e.key === "3") this.setViewMode("original");
      else if (e.key === "4") this.setViewMode("mask");
      else if (e.key === "[") {
        this.brushSize = Math.max(10, this.brushSize - 10);
        const inp = document.getElementById("brush-size");
        inp.value = this.brushSize;
        document.getElementById("val-brush-size").textContent = `${this.brushSize}px`;
        this._updateRangeFillProgress(inp);
      } else if (e.key === "]") {
        this.brushSize = Math.min(220, this.brushSize + 10);
        const inp = document.getElementById("brush-size");
        inp.value = this.brushSize;
        document.getElementById("val-brush-size").textContent = `${this.brushSize}px`;
        this._updateRangeFillProgress(inp);
      } else if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) {
        rerollSeed();
      } else if (e.key === "?") {
        if (this.shortcutsModal) {
          this.shortcutsModal.classList.toggle("hidden");
        }
      } else if (e.key === "Escape") {
        if (this.shortcutsModal) {
          this.shortcutsModal.classList.add("hidden");
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space" && this.isPeekingOriginal) {
        this.isPeekingOriginal = false;
        if (this.holdCompareBtn) this.holdCompareBtn.classList.remove("peeking");
        this.scheduleRender();
      }
    });
  }

  setViewMode(mode) {
    this.viewMode = mode;
    document.querySelectorAll(".pill-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === mode);
    });
    this._updateViewModeUI();
    this.scheduleRender();
  }

  setZoom(z) {
    this.zoom = z;
    this.canvasContainer.style.transform = `scale(${z})`;
    document.getElementById("zoom-label").textContent =
      Math.abs(z - 1.0) < 0.05 ? "Fit" : `${Math.round(z * 100)}%`;
  }

  _updateViewModeUI() {
    if (this.viewMode === "split" && !this.isPeekingOriginal) {
      this.originalOverlayCanvas.classList.remove("hidden");
      this.splitSlider.classList.remove("hidden");
      this._updateSplitClip();
    } else {
      this.originalOverlayCanvas.classList.add("hidden");
      this.splitSlider.classList.add("hidden");
    }
  }

  _updateSplitClip() {
    const pct = (this.splitPos * 100).toFixed(2);
    this.originalOverlayCanvas.style.clipPath = `inset(0 ${100 - this.splitPos * 100}% 0 0)`;
    this.splitSlider.querySelector(".split-line").style.left = `${pct}%`;
    this.splitSlider.querySelector(".split-handle").style.left = `${pct}%`;
  }

  /**
   * Displays a non-blocking studio toast notification.
   * @param {string} message
   */
  showToast(message) {
    if (!this.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.2s ease";
      setTimeout(() => toast.remove(), 220);
    }, 2200);
  }

  /**
   * Loads a user-selected local image file via FileReader.
   * @param {File} file
   */
  loadUserFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        this.currentImageElement = img;
        this.history.clear();
        this._updateHistoryButtons();
        this.aiStatusBadge.textContent = "Saliency Mask";
        this.engine.loadImage(img, 1080);
        this._drawOriginalOverlay();
        if (this.photoCredit) {
          this.photoCredit.textContent = `Local File: ${file.name} (${img.naturalWidth}×${img.naturalHeight})`;
        }
        this.scheduleRender();
        this.showToast(`Loaded "${file.name}"`);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  _drawOriginalOverlay() {
    if (!this.engine.srcData) return;
    this.originalOverlayCanvas.width = this.engine.width;
    this.originalOverlayCanvas.height = this.engine.height;
    const ctx = this.originalOverlayCanvas.getContext("2d");
    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(this.engine.srcData),
        this.engine.width,
        this.engine.height
      ),
      0,
      0
    );
  }

  /**
   * Optional Precision Neural Subject Segmentation via MediaPipe SelfieSegmentation.
   * Fuses neural person probabilities with local saliency so held objects/pets remain intact.
   */
  async runMediaPipeCutout() {
    const btn = document.getElementById("ai-cutout-btn");
    const labelSpan = document.getElementById("ai-cutout-btn-label");
    const origText = labelSpan ? labelSpan.textContent : "Run Neural Subject Cutout";
    if (labelSpan) labelSpan.textContent = "Running Neural Segmentation...";
    btn.disabled = true;

    try {
      if (typeof SelfieSegmentation === "undefined") {
        throw new Error("MediaPipe CDN unavailable — using local Saliency Mask");
      }

      const segmenter = new SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      segmenter.setOptions({ modelSelection: 1 });

      await new Promise((resolve, reject) => {
        segmenter.onResults((results) => {
          if (!results.segmentationMask) {
            reject(new Error("No segmentation mask returned"));
            return;
          }
          const w = this.engine.width;
          const h = this.engine.height;
          const off = document.createElement("canvas");
          off.width = w;
          off.height = h;
          const ctx = off.getContext("2d");
          ctx.drawImage(results.segmentationMask, 0, 0, w, h);
          const maskData = ctx.getImageData(0, 0, w, h).data;
          const floatMask = new Float32Array(w * h);
          for (let i = 0; i < w * h; i++) {
            const aiVal = maskData[i * 4] / 255;
            floatMask[i] = Math.max(aiVal, this.engine.autoSubjectMask[i] * 0.85);
          }
          this.engine.setAISubjectMask(floatMask);
          this.aiStatusBadge.textContent = "Neural Mask Active";
          resolve();
        });

        const tmp = document.createElement("canvas");
        tmp.width = this.engine.width;
        tmp.height = this.engine.height;
        tmp
          .getContext("2d")
          .putImageData(
            new ImageData(
              new Uint8ClampedArray(this.engine.srcData),
              this.engine.width,
              this.engine.height
            ),
            0,
            0
          );
        segmenter.send({ image: tmp }).catch(reject);
      });

      this.params.cutoutMode = "smart";
      this._syncUIFromParams();
      this.scheduleRender();
      this.showToast("Neural subject cutout applied");
    } catch (err) {
      this.aiStatusBadge.textContent = "Enhanced Saliency";
      this.params.cutoutMode = "smart";
      this.scheduleRender();
      this.showToast("Applied enhanced local saliency cutout");
    } finally {
      if (labelSpan) labelSpan.textContent = origText;
      btn.disabled = false;
    }
  }

  /**
   * Throttles rendering to `requestAnimationFrame` for 60 FPS slider responsiveness.
   */
  scheduleRender() {
    if (this.renderPending) return;
    this.renderPending = true;
    this.statusDot.classList.add("busy");

    requestAnimationFrame(() => {
      this.renderPending = false;
      this._updateViewModeUI();
      const effectiveMode = this.isPeekingOriginal
        ? "original"
        : this.viewMode === "split"
        ? "result"
        : this.viewMode;

      const elapsed = this.engine.render(
        this.outputCanvas,
        this.params,
        effectiveMode
      );
      this.statusDot.classList.remove("busy");
      const passType = this.engine.lastCacheHit ? "Cached" : "Full Pass";
      this.renderTimeLabel.textContent = `${Math.round(elapsed)} ms · ${this.engine.width}×${this.engine.height} · ${passType}`;
    });
  }

  /**
   * Exports high-resolution PNG artwork (`1x`, `1.5x`, or `2x`).
   */
  exportArtwork() {
    const scaleSelect = document.getElementById("export-scale");
    const mult = parseFloat(scaleSelect.value) || 1;

    const exportCanvas = document.createElement("canvas");
    if (mult === 1) {
      this.engine.render(exportCanvas, this.params, "result");
    } else {
      const tempEngine = new WatercolorEngine();
      tempEngine.setSeed(this.engine.seed);
      const targetDim = Math.round(
        Math.max(this.engine.width, this.engine.height) * mult
      );
      if (this.currentImageElement) {
        tempEngine.loadImage(this.currentImageElement, targetDim);
      } else {
        tempEngine.loadImage(this.outputCanvas, targetDim);
      }
      tempEngine.render(exportCanvas, this.params, "result");
    }

    const link = document.createElement("a");
    link.download = `splashcanvas-${this.currentPresetId}-${exportCanvas.width}x${exportCanvas.height}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
    this.showToast(
      `Exported ${exportCanvas.width}×${exportCanvas.height} PNG print`
    );
  }

  /**
   * Loads a real, free-to-use high-resolution photograph from `SAMPLE_CATALOG`
   * with CORS enabled (`crossOrigin = "anonymous"`). Automatically falls back to
   * local procedural synthesis if the device is offline.
   *
   * @param {string} sampleKey
   * @param {boolean} [notify=true]
   */
  loadSampleScene(sampleKey, notify = true) {
    const meta = SAMPLE_CATALOG[sampleKey] || SAMPLE_CATALOG.portrait;
    this.currentSampleId = meta.id;

    // Highlight active item in sample menu
    this.sampleMenu.querySelectorAll("button[data-sample]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.sample === meta.id);
    });

    this.statusDot.classList.add("busy");
    this.renderTimeLabel.textContent = `Loading "${meta.title}"...`;

    const remoteImg = new Image();
    remoteImg.crossOrigin = "anonymous";
    let didFinish = false;

    const timeoutId = setTimeout(() => {
      if (didFinish) return;
      didFinish = true;
      this._loadProceduralFallback(meta, notify);
    }, 6000);

    remoteImg.onload = () => {
      if (didFinish) return;
      didFinish = true;
      clearTimeout(timeoutId);

      this.currentImageElement = remoteImg;
      this.history.clear();
      this._updateHistoryButtons();
      this.aiStatusBadge.textContent = "Saliency Mask";
      this.engine.loadImage(remoteImg, 1080);
      this._drawOriginalOverlay();

      if (this.photoCredit) {
        this.photoCredit.innerHTML = `Sample Photo: <a href="${meta.photographerUrl}" target="_blank" rel="noopener noreferrer">${meta.title}</a> by ${meta.photographer} (Unsplash Free License)`;
      }

      this.scheduleRender();
      if (notify) {
        this.showToast(`Loaded "${meta.title}"`);
      }
    };

    remoteImg.onerror = () => {
      if (didFinish) return;
      didFinish = true;
      clearTimeout(timeoutId);
      this._loadProceduralFallback(meta, notify);
    };

    remoteImg.src = meta.url;
  }

  /**
   * Offline procedural fallback generator so SplashCanvas remains 100% functional
   * even without internet access.
   * @private
   */
  _loadProceduralFallback(meta, notify) {
    const canvas = document.createElement("canvas");
    canvas.width = 860;
    canvas.height = 1040;
    const ctx = canvas.getContext("2d");

    if (meta.id === "surfers") {
      this._drawSurfersSample(ctx, canvas.width, canvas.height);
    } else if (meta.id === "pet") {
      this._drawPetSample(ctx, canvas.width, canvas.height);
    } else if (meta.id === "architecture") {
      this._drawArchitectureSample(ctx, canvas.width, canvas.height);
    } else {
      this._drawPortraitSample(ctx, canvas.width, canvas.height);
    }

    const fallbackImg = new Image();
    fallbackImg.onload = () => {
      this.currentImageElement = fallbackImg;
      this.history.clear();
      this._updateHistoryButtons();
      this.engine.loadImage(fallbackImg, 1000);
      this._drawOriginalOverlay();
      if (this.photoCredit) {
        this.photoCredit.textContent = `${meta.title} (Offline Procedural Studio Scene)`;
      }
      this.scheduleRender();
      if (notify) {
        this.showToast(`Loaded offline scene "${meta.title}"`);
      }
    };
    fallbackImg.src = canvas.toDataURL("image/png");
  }

  _drawPortraitSample(ctx, w, h) {
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#8da48e");
    bgGrad.addColorStop(1, "#5c7460");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#c85a32";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.82, 220, 190, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e2a985";
    ctx.fillRect(w * 0.45, h * 0.48, 86, 130);
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.4, 115, 145, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4a2518";
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.36, 135, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    ctx.fillStyle = "#e6cfa8";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.25, 210, 52, -0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3a251e";
    ctx.beginPath();
    ctx.arc(w * 0.45, h * 0.39, 9, 0, Math.PI * 2);
    ctx.arc(w * 0.55, h * 0.39, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c95b54";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.47, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPetSample(ctx, w, h) {
    ctx.fillStyle = "#7a9a76";
    ctx.fillRect(0, 0, w, h);

    const coatGrad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.52,
      40,
      w * 0.5,
      h * 0.55,
      310
    );
    coatGrad.addColorStop(0, "#f2cb82");
    coatGrad.addColorStop(0.6, "#d99f4c");
    coatGrad.addColorStop(1, "#aa7027");
    ctx.fillStyle = coatGrad;

    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.75, 195, 220, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, 145, 155, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9e6320";
    ctx.beginPath();
    ctx.ellipse(w * 0.33, h * 0.43, 45, 110, 0.25, 0, Math.PI * 2);
    ctx.ellipse(w * 0.67, h * 0.43, 45, 110, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#231c18";
    ctx.beginPath();
    ctx.arc(w * 0.43, h * 0.39, 13, 0, Math.PI * 2);
    ctx.arc(w * 0.57, h * 0.39, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.47, 26, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e5737d";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.54, 22, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawSurfersSample(ctx, w, h) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    skyGrad.addColorStop(0, "#bcd4e6");
    skyGrad.addColorStop(1, "#e5eef4");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.62);

    const seaGrad = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.72);
    seaGrad.addColorStop(0, "#5c8d9c");
    seaGrad.addColorStop(1, "#dfecee");
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, h * 0.58, w, h * 0.14);

    ctx.fillStyle = "#d8c3a5";
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    ctx.save();
    ctx.translate(w * 0.35, h * 0.49);
    ctx.rotate(0.03);
    ctx.fillStyle = "#c8e61e";
    ctx.beginPath();
    ctx.moveTo(0, -310);
    ctx.bezierCurveTo(88, -210, 92, 120, 52, 310);
    ctx.lineTo(-52, 310);
    ctx.bezierCurveTo(-92, 120, -88, -210, 0, -310);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#2b547e";
    ctx.fillRect(w * 0.43, h * 0.47, 125, 135);
    ctx.fillStyle = "#f4f6f9";
    ctx.fillRect(w * 0.43, h * 0.28, 118, 195);
    ctx.fillStyle = "#d91b2e";
    ctx.beginPath();
    ctx.roundRect(w * 0.57, h * 0.34, 105, 135, 12);
    ctx.fill();
  }

  _drawArchitectureSample(ctx, w, h) {
    ctx.fillStyle = "#c6def1";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#e8b88a";
    ctx.fillRect(w * 0.12, h * 0.18, w * 0.35, h * 0.58);
    ctx.fillStyle = "#d47a55";
    ctx.fillRect(w * 0.52, h * 0.22, w * 0.36, h * 0.54);

    ctx.fillStyle = "#3f6a58";
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillRect(
          w * (0.18 + col * 0.12),
          h * (0.25 + row * 0.14),
          38,
          62
        );
        ctx.fillRect(
          w * (0.58 + col * 0.13),
          h * (0.28 + row * 0.14),
          38,
          62
        );
      }
    }

    ctx.fillStyle = "#4d8098";
    ctx.fillRect(0, h * 0.74, w, h * 0.26);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.splashCanvasApp = new SplashCanvasApp();
});
