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
      deckleEdge: 45,
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
      deckleEdge: 50,
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
      deckleEdge: 40,
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
      deckleEdge: 65,
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
      deckleEdge: 55,
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
      deckleEdge: 70,
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
      deckleEdge: 35,
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
      deckleEdge: 60,
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
    this.controlView = localStorage.getItem("splashcanvas_control_view") || "standard";
    this.customPresets = this._loadCustomPresets();
    this.viewMode = "result"; // 'result' | 'split' | 'original' | 'mask'
    this.isPeekingOriginal = false;
    this.brushMode = "none";  // 'none' | 'restore' | 'erase'
    this.brushSize = 65;
    this.brushSoftness = 75;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.currentFrame = "none"; // 'none' | 'oak' | 'black' | 'white'
    this.splitPos = 0.5;
    this.currentImageElement = null;
    this.currentSampleId = "portrait";
    this.renderPending = false;
    this._sliderPreDragState = null;

    this._cacheDOM();
    this.setControlView(this.controlView);
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
    this.presetCountBadge = document.getElementById("preset-count-badge");
    this.renderTimeLabel = document.getElementById("render-time-label");
    this.statusDot = document.getElementById("status-dot");
    this.seedReadout = document.getElementById("seed-readout");
    this.mobileSeedReadout = document.getElementById("mobile-seed-readout");
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
    this.smartEnhanceBtn = document.getElementById("smart-enhance-btn");
    this.viewModeToggleBtn = document.getElementById("view-mode-toggle");
    this.savePresetBtn = document.getElementById("save-preset-btn");
    this.savePresetModal = document.getElementById("save-preset-modal");
    this.savePresetForm = document.getElementById("save-preset-form");
    this.customPresetNameInput = document.getElementById("custom-preset-name-input");
    this.closeSavePresetBtn = document.getElementById("close-save-preset-btn");
    this.cancelSavePresetBtn = document.getElementById("cancel-save-preset-btn");
    this.paramSearchInput = document.getElementById("param-search-input");
    this.shortcutsModal = document.getElementById("shortcuts-modal");
    this.toastContainer = document.getElementById("toast-container");
    this.workspace = document.getElementById("workspace");
    this.leftDrawerTitle = document.getElementById("left-drawer-title");

    // Milestone 3: Gallery Framing & Print Studio
    this.frameSelect = document.getElementById("frame-select");
    this.exportBtn = document.getElementById("export-btn");
    this.exportScale = document.getElementById("export-scale");
    this.exportModal = document.getElementById("export-modal");
    this.closeExportModalBtn = document.getElementById("close-export-modal-btn");
    this.exportScaleSelect = document.getElementById("export-scale-select");
    this.exportFormatSelect = document.getElementById("export-format-select");
    this.exportIncludeFrame = document.getElementById("export-include-frame");
    this.exportFrameDesc = document.getElementById("export-frame-desc");
    this.exportResPixels = document.getElementById("export-res-pixels");
    this.exportResPrint = document.getElementById("export-res-print");
    this.copyClipboardBtn = document.getElementById("copy-clipboard-btn");
    this.doDownloadBtn = document.getElementById("do-download-btn");
  }

  /**
   * Switches the active workspace view panel on mobile and tablet screens.
   * Tapping an already-open drawer tab toggles back to full-canvas view ("center").
   * @param {"center"|"presets"|"mask"|"right"} panelName
   */
  setActivePanel(panelName) {
    if (!this.workspace) return;
    const current = this.workspace.dataset.activePanel || "center";
    const nextPanel =
      panelName !== "center" && current === panelName ? "center" : panelName;

    this.workspace.dataset.activePanel = nextPanel;

    if (this.leftDrawerTitle) {
      this.leftDrawerTitle.textContent =
        nextPanel === "mask" ? "Cutout & Mask Brush" : "Presets & Paper";
    }

    document.querySelectorAll(".mobile-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.panel === nextPanel);
    });

    const leftPanel = document.getElementById("left-panel");
    if (leftPanel && (nextPanel === "presets" || nextPanel === "mask")) {
      leftPanel.scrollTop = 0;
    }

    this.scheduleRender();
  }

  _loadCustomPresets() {
    try {
      const saved = localStorage.getItem("splashcanvas_custom_presets");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  }

  _saveCustomPresets() {
    try {
      localStorage.setItem(
        "splashcanvas_custom_presets",
        JSON.stringify(this.customPresets)
      );
    } catch (_) {}
  }

  getAllPresets() {
    return [...PRESETS, ...this.customPresets];
  }

  saveCustomPreset(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const newPreset = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      desc: "Custom User Style",
      isCustom: true,
      swatches: [this.params.paperTint || "#f6f5f0", "#38bdf8", "#818cf8"],
      params: { ...this.params },
    };
    this.customPresets.push(newPreset);
    this._saveCustomPresets();
    this.currentPresetId = newPreset.id;
    this._buildPresetCards();
    this.showToast(`Saved custom preset "${trimmed}"`);
  }

  deleteCustomPreset(id) {
    const found = this.customPresets.find((p) => p.id === id);
    const name = found ? found.name : "Custom";
    this.customPresets = this.customPresets.filter((p) => p.id !== id);
    this._saveCustomPresets();
    if (this.currentPresetId === id) {
      this.currentPresetId = PRESETS[0].id;
      this.applyPreset(PRESETS[0].id);
    } else {
      this._buildPresetCards();
    }
    this.showToast(`Deleted preset "${name}"`);
  }

  setControlView(mode) {
    this.controlView = mode === "advanced" ? "advanced" : "standard";
    try {
      localStorage.setItem("splashcanvas_control_view", this.controlView);
    } catch (_) {}

    document.body.classList.toggle("mode-standard", this.controlView === "standard");
    document.body.classList.toggle("mode-advanced", this.controlView === "advanced");

    if (this.viewModeToggleBtn) {
      this.viewModeToggleBtn.textContent =
        this.controlView === "standard" ? "Advanced View" : "Standard View";
      this.viewModeToggleBtn.title =
        this.controlView === "standard"
          ? "Switch to Advanced View (all 25 parameters)"
          : "Switch to Standard View (15 essential parameters)";
    }

    const allPill = document.querySelector('.cat-pill[data-cat="all"]');
    if (allPill) {
      allPill.textContent =
        this.controlView === "standard" ? "All (15)" : "All (25)";
    }
  }

  toggleControlView() {
    this.setControlView(
      this.controlView === "standard" ? "advanced" : "standard"
    );
    this.showToast(
      this.controlView === "standard"
        ? "Switched to Standard View (15 core sliders)"
        : "Switched to Advanced View (all 25 sliders)"
    );
  }

  _buildPresetCards() {
    this.presetGrid.innerHTML = "";
    const allPresets = this.getAllPresets();
    if (this.presetCountBadge) {
      this.presetCountBadge.textContent = `${allPresets.length} Styles`;
    }

    allPresets.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `preset-card ${
        preset.id === this.currentPresetId ? "active" : ""
      } ${preset.isCustom ? "custom-preset" : ""}`;
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

      if (preset.isCustom) {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "preset-delete-btn";
        delBtn.title = `Delete "${preset.name}" preset`;
        delBtn.innerHTML = "✕";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deleteCustomPreset(preset.id);
        });
        btn.appendChild(delBtn);
      }

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
      if (this.mobileSeedReadout) {
        this.mobileSeedReadout.textContent = `#${snapshot.seed}`;
      }
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
    const found = this.getAllPresets().find((p) => p.id === presetId);
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
      this.getAllPresets().find((p) => p.id === this.currentPresetId) ||
      PRESETS[0];
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
      this.getAllPresets().find((p) => p.id === this.currentPresetId) ||
      PRESETS[0];
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

    // Quick Category Filter Pills (All / Brush / Wash / Splatter / Sketch / Paper / Grade)
    document.querySelectorAll(".cat-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        const cat = pill.dataset.cat || "all";
        document.querySelectorAll(".cat-pill").forEach((p) => {
          p.classList.toggle("active", p === pill);
        });
        if (this.paramSearchInput && this.paramSearchInput.value) {
          this.paramSearchInput.value = "";
          document.body.classList.remove("is-searching");
        }
        document.querySelectorAll(".control-group").forEach((group) => {
          group.querySelectorAll(".control-row").forEach((r) => {
            r.classList.remove("hidden");
          });
          const match = cat === "all" || group.dataset.group === cat;
          group.classList.toggle("hidden", !match);
          if (match) {
            group.setAttribute("open", "");
          }
        });
        const scrollEl = document.getElementById("sliders-scroll");
        if (scrollEl) scrollEl.scrollTop = 0;
      });
    });

    // Parameter Filter / Search bar
    if (this.paramSearchInput) {
      this.paramSearchInput.addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        document.body.classList.toggle("is-searching", Boolean(q));
        if (q) {
          document.querySelectorAll(".cat-pill").forEach((p) => {
            p.classList.toggle("active", p.dataset.cat === "all");
          });
        }
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
        this._updatePanCursor();
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

    // Pointer-Drag Canvas Panning when zoom > 1.0 and brushMode === 'none'
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    const startPan = (e) => {
      if (this.zoom <= 1.0 || this.brushMode !== "none") return;
      if (
        e.target.closest("#split-slider") ||
        e.target.closest(".viewport-footer") ||
        e.target.closest(".brush-cursor")
      ) {
        return;
      }
      isPanning = true;
      panStartX = e.clientX - this.panX;
      panStartY = e.clientY - this.panY;
      this.canvasViewport.classList.add("is-panning");
      try {
        this.canvasViewport.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const doPan = (e) => {
      if (!isPanning) return;
      this.panX = e.clientX - panStartX;
      this.panY = e.clientY - panStartY;
      this._updateCanvasTransform();
    };

    const stopPan = (e) => {
      if (!isPanning) return;
      isPanning = false;
      this.canvasViewport.classList.remove("is-panning");
      try {
        this.canvasViewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };

    this.canvasViewport.addEventListener("pointerdown", startPan);
    this.canvasViewport.addEventListener("pointermove", doPan);
    this.canvasViewport.addEventListener("pointerup", stopPan);
    this.canvasViewport.addEventListener("pointercancel", stopPan);

    // Split Comparison Slider Dragging (with touch pointer capture)
    let isDraggingSplit = false;
    const updateSplitPosition = (clientX) => {
      const rect = this.outputCanvas.getBoundingClientRect();
      if (!rect.width) return;
      this.splitPos = Math.max(
        0.02,
        Math.min(0.98, (clientX - rect.left) / rect.width)
      );
      this._updateSplitClip();
    };

    this.splitSlider.addEventListener("pointerdown", (e) => {
      isDraggingSplit = true;
      try {
        this.splitSlider.setPointerCapture(e.pointerId);
      } catch (_) {}
      updateSplitPosition(e.clientX);
      e.stopPropagation();
    });
    this.splitSlider.addEventListener("pointermove", (e) => {
      if (!isDraggingSplit) return;
      updateSplitPosition(e.clientX);
    });
    const stopSplitDrag = (e) => {
      if (!isDraggingSplit) return;
      isDraggingSplit = false;
      try {
        this.splitSlider.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };
    this.splitSlider.addEventListener("pointerup", stopSplitDrag);
    this.splitSlider.addEventListener("pointercancel", stopSplitDrag);
    window.addEventListener("pointermove", (e) => {
      if (isDraggingSplit) updateSplitPosition(e.clientX);
    });
    window.addEventListener("pointerup", stopSplitDrag);

    // Mobile / Tablet Panel Switcher
    document.querySelectorAll(".mobile-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setActivePanel(btn.dataset.panel);
      });
    });

    document.querySelectorAll(".btn-return-canvas").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setActivePanel("center");
      });
    });

    window.addEventListener("resize", () => {
      if (
        window.innerWidth > 1024 &&
        this.workspace &&
        this.workspace.dataset.activePanel !== "center"
      ) {
        this.setActivePanel("center");
      }
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
      if (this.mobileSeedReadout) {
        this.mobileSeedReadout.textContent = `#${nextSeed}`;
      }
      this.scheduleRender();
      this.showToast(`Re-rolled splatter seed (#${nextSeed})`);
    };

    document
      .getElementById("randomize-seed-btn")
      .addEventListener("click", rerollSeed);
    document
      .getElementById("seed-pill-btn")
      .addEventListener("click", rerollSeed);
    const mobileSeedBtn = document.getElementById("mobile-seed-btn");
    if (mobileSeedBtn) {
      mobileSeedBtn.addEventListener("click", rerollSeed);
    }

    const resetAllParams = () => {
      this._recordHistorySnapshot();
      this.engine.clearUserBrushMask();
      this.applyPreset(this.currentPresetId);
      this.showToast("Reset all parameters to preset defaults");
    };

    document
      .getElementById("reset-all-btn")
      .addEventListener("click", resetAllParams);
    const mobileResetBtn = document.getElementById("mobile-reset-btn");
    if (mobileResetBtn) {
      mobileResetBtn.addEventListener("click", resetAllParams);
    }
    const mobileSlidersResetBtn = document.getElementById(
      "mobile-sliders-reset-btn"
    );
    if (mobileSlidersResetBtn) {
      mobileSlidersResetBtn.addEventListener("click", resetAllParams);
    }

    document.getElementById("export-btn").addEventListener("click", () => {
      this.openExportModal();
    });

    // Gallery Frame Selection
    if (this.frameSelect) {
      this.frameSelect.addEventListener("change", (e) => {
        this.setFrame(e.target.value);
      });
    }

    // Export / Print Studio Modal wiring
    if (this.closeExportModalBtn) {
      this.closeExportModalBtn.addEventListener("click", () => {
        this.closeExportModal();
      });
    }

    if (this.exportModal) {
      this.exportModal.addEventListener("click", (e) => {
        if (e.target === this.exportModal) {
          this.closeExportModal();
        }
      });
    }

    if (this.exportScaleSelect) {
      this.exportScaleSelect.addEventListener("change", () => {
        if (this.exportScale) {
          this.exportScale.value = this.exportScaleSelect.value;
        }
        this._updateExportReadout();
      });
    }

    if (this.exportScale) {
      this.exportScale.addEventListener("change", () => {
        if (this.exportScaleSelect) {
          this.exportScaleSelect.value = this.exportScale.value;
        }
        this._updateExportReadout();
      });
    }

    if (this.exportIncludeFrame) {
      this.exportIncludeFrame.addEventListener("change", () => {
        this._updateExportReadout();
      });
    }

    if (this.doDownloadBtn) {
      this.doDownloadBtn.addEventListener("click", () => {
        this.executeExport("download");
      });
    }

    if (this.copyClipboardBtn) {
      this.copyClipboardBtn.addEventListener("click", () => {
        this.executeExport("clipboard");
      });
    }

    document.getElementById("ai-cutout-btn").addEventListener("click", () => {
      this.runMediaPipeCutout();
    });

    // 1-Click Smart Enhance
    if (this.smartEnhanceBtn) {
      this.smartEnhanceBtn.addEventListener("click", () => {
        this.smartEnhance();
      });
    }

    // View Mode Toggle (Standard vs Advanced)
    if (this.viewModeToggleBtn) {
      this.viewModeToggleBtn.addEventListener("click", () => {
        this.toggleControlView();
      });
    }

    // Save Custom Preset Modal wiring
    if (this.savePresetBtn && this.savePresetModal) {
      this.savePresetBtn.addEventListener("click", () => {
        this.savePresetModal.classList.remove("hidden");
        if (this.customPresetNameInput) {
          this.customPresetNameInput.value = "";
          setTimeout(() => this.customPresetNameInput.focus(), 50);
        }
      });

      const closeSaveModal = () => {
        this.savePresetModal.classList.add("hidden");
      };

      if (this.closeSavePresetBtn) {
        this.closeSavePresetBtn.addEventListener("click", closeSaveModal);
      }
      if (this.cancelSavePresetBtn) {
        this.cancelSavePresetBtn.addEventListener("click", closeSaveModal);
      }
      this.savePresetModal.addEventListener("click", (e) => {
        if (e.target === this.savePresetModal) closeSaveModal();
      });

      if (this.savePresetForm) {
        this.savePresetForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const name = this.customPresetNameInput
            ? this.customPresetNameInput.value
            : "";
          if (name) {
            this.saveCustomPreset(name);
            closeSaveModal();
          }
        });
      }
    }

    // Clipboard Paste Ingestion (Cmd/Ctrl+V)
    window.addEventListener("paste", (e) => {
      const activeTag = document.activeElement
        ? document.activeElement.tagName
        : "";
      if (
        ["INPUT", "TEXTAREA"].includes(activeTag) ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            this.loadUserFile(file);
            this.showToast("Loaded image from clipboard (Cmd/Ctrl+V)");
            return;
          }
        }
      }
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
        if (this.savePresetModal) {
          this.savePresetModal.classList.add("hidden");
        }
        this.closeExportModal();
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

  _updateCanvasTransform() {
    this.canvasContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  _updatePanCursor() {
    if (!this.canvasViewport) return;
    const canPan = this.zoom > 1.0 && this.brushMode === "none";
    this.canvasViewport.classList.toggle("can-pan", canPan);
  }

  setZoom(z) {
    this.zoom = z;
    if (z <= 1.0) {
      this.panX = 0;
      this.panY = 0;
    }
    this._updateCanvasTransform();
    document.getElementById("zoom-label").textContent =
      Math.abs(z - 1.0) < 0.05 ? "Fit" : `${Math.round(z * 100)}%`;
    this._updatePanCursor();
  }

  /**
   * 1-Click Smart Enhance: Analyzes the source photograph's dynamic range,
   * luminance, and saturation distribution to auto-tune vibrancy, tonal contrast,
   * and luminous glaze.
   */
  smartEnhance() {
    if (!this.engine.srcData || !this.engine.width || !this.engine.height) return;
    this._recordHistorySnapshot();

    const w = this.engine.width;
    const h = this.engine.height;
    const total = w * h;
    const src = this.engine.srcData;

    // Sample ~20,000 pixels with uniform stride
    const step = Math.max(1, Math.floor(total / 20000));
    let sumL = 0;
    let sumSat = 0;
    let minL = 255;
    let maxL = 0;
    let count = 0;

    for (let i = 0; i < total; i += step) {
      const p = i * 4;
      const r = src[p];
      const g = src[p + 1];
      const b = src[p + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumL += lum;
      if (lum < minL) minL = lum;
      if (lum > maxL) maxL = lum;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      sumSat += sat;
      count++;
    }

    const avgL = sumL / count;
    const avgSat = sumSat / count;
    const dynRange = maxL - minL;

    // 1. Tonal Contrast: boost if dynRange is narrow (< 150), settle if high (> 220)
    let contrastTarget = 14;
    if (dynRange < 150) {
      contrastTarget = 26;
    } else if (dynRange < 190) {
      contrastTarget = 20;
    } else if (dynRange > 230) {
      contrastTarget = 10;
    }

    // 2. Luminous Glaze: if dark overall, add luminosity; if already very bright, pull down
    let lumTarget = 16;
    if (avgL < 90) {
      lumTarget = 24;
    } else if (avgL < 125) {
      lumTarget = 18;
    } else if (avgL > 180) {
      lumTarget = 4;
    }

    // 3. Vibrancy: if muted/dull, boost; if already saturated, moderate boost
    let vibTarget = 30;
    if (avgSat < 0.22) {
      vibTarget = 45;
    } else if (avgSat < 0.38) {
      vibTarget = 34;
    } else if (avgSat > 0.60) {
      vibTarget = 18;
    }

    this.params.contrast = contrastTarget;
    this.params.luminosity = lumTarget;
    this.params.vibrancy = vibTarget;

    this._syncUIFromParams();
    this.scheduleRender();
    this.showToast("Smart Enhance: Calibrated contrast, glaze & vibrancy");
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
   * Sets the active gallery frame style ('none', 'oak', 'black', 'white').
   * @param {"none"|"oak"|"black"|"white"} frameId
   */
  setFrame(frameId) {
    this.currentFrame = frameId || "none";
    if (this.canvasContainer) {
      this.canvasContainer.classList.remove(
        "frame-oak",
        "frame-black",
        "frame-white"
      );
      if (this.currentFrame !== "none") {
        this.canvasContainer.classList.add(`frame-${this.currentFrame}`);
      }
    }
    if (this.frameSelect) {
      this.frameSelect.value = this.currentFrame;
    }
    if (this.exportIncludeFrame) {
      const hasFrame = this.currentFrame !== "none";
      this.exportIncludeFrame.disabled = !hasFrame;
      this.exportIncludeFrame.checked = hasFrame;
      if (this.exportFrameDesc) {
        const frameNames = {
          oak: "natural oak moulding and bevel mat",
          black: "gallery black moulding and bevel mat",
          white: "floating white moulding and bevel mat",
        };
        this.exportFrameDesc.textContent = hasFrame
          ? `Bakes ${frameNames[this.currentFrame]} into image file`
          : "Select a gallery frame on the stage to enable frame export";
      }
    }
    this._updateExportReadout();

    const frameTitles = {
      none: "Raw Canvas",
      oak: "Natural Oak",
      black: "Gallery Black",
      white: "White Float",
    };
    if (this.currentFrame === "none") {
      this.showToast("Removed gallery frame");
    } else {
      this.showToast(`Applied ${frameTitles[this.currentFrame]} gallery frame`);
    }
  }

  /**
   * Opens the Print Studio & Export dialog.
   */
  openExportModal() {
    if (!this.exportModal) return;
    this.exportModal.classList.remove("hidden");
    if (this.exportScaleSelect && this.exportScale) {
      this.exportScaleSelect.value = this.exportScale.value;
    }
    this._updateExportReadout();
  }

  /**
   * Closes the Print Studio & Export dialog.
   */
  closeExportModal() {
    if (!this.exportModal) return;
    this.exportModal.classList.add("hidden");
  }

  /**
   * Updates real-time 300 DPI print dimension readouts in the export modal.
   */
  _updateExportReadout() {
    if (!this.exportResPixels || !this.exportResPrint) return;
    const scaleSelect = this.exportScaleSelect || this.exportScale;
    const mult = parseFloat(scaleSelect ? scaleSelect.value : 1) || 1;

    const baseW = (this.engine && this.engine.width) || 1080;
    const baseH = (this.engine && this.engine.height) || 1350;
    const artW = Math.round(baseW * mult);
    const artH = Math.round(baseH * mult);

    const includeFrame = Boolean(
      this.exportIncludeFrame &&
        this.exportIncludeFrame.checked &&
        this.currentFrame !== "none"
    );

    let finalW = artW;
    let finalH = artH;

    if (includeFrame) {
      const minDim = Math.min(artW, artH);
      const matW = Math.round(minDim * 0.05);
      const frameW = Math.round(minDim * 0.032);
      const border = matW + frameW;
      finalW += border * 2;
      finalH += border * 2;
    }

    const wIn = finalW / 300;
    const hIn = finalH / 300;
    const wCm = wIn * 2.54;
    const hCm = hIn * 2.54;

    this.exportResPixels.textContent = `${finalW} × ${finalH} px`;
    this.exportResPrint.textContent = `${wIn.toFixed(1)}″ × ${hIn.toFixed(1)}″ (${wCm.toFixed(1)} × ${hCm.toFixed(1)} cm) @ 300 DPI Archival`;
  }

  /**
   * Triggers Print Studio modal or direct export.
   */
  exportArtwork() {
    this.openExportModal();
  }

  /**
   * Executes download or direct clipboard copy with optional framing and hybrid resolution.
   * @param {"download"|"clipboard"} [action="download"]
   */
  async executeExport(action = "download") {
    const scaleSelect = this.exportScaleSelect || this.exportScale;
    const mult = parseFloat(scaleSelect ? scaleSelect.value : 1) || 1;
    const formatValue = this.exportFormatSelect
      ? this.exportFormatSelect.value
      : "image/png";
    const [mimeType, qualityStr] = formatValue.split(";");
    const quality = qualityStr ? parseFloat(qualityStr) : 0.95;

    const includeFrame = Boolean(
      this.exportIncludeFrame &&
        this.exportIncludeFrame.checked &&
        this.currentFrame !== "none"
    );

    this.showToast(
      action === "clipboard"
        ? "Rendering artwork for clipboard..."
        : "Rendering print artwork..."
    );

    // Yield to let UI update / toast show
    await new Promise((r) => setTimeout(r, 40));

    const finalCanvas = this._renderExportArtwork(mult, includeFrame);

    if (action === "clipboard") {
      await this.copyArtworkToClipboard(finalCanvas);
    } else {
      const ext = mimeType === "image/jpeg" ? "jpg" : "png";
      const frameTag = includeFrame ? `-${this.currentFrame}-frame` : "";
      const filename = `splashcanvas-${this.currentPresetId}${frameTag}-${finalCanvas.width}x${finalCanvas.height}.${ext}`;
      this._downloadCanvas(finalCanvas, mimeType, quality, filename);
    }

    this.closeExportModal();
  }

  /**
   * Renders the export canvas at native or multi-scale resolution with optional frame compositing.
   * @private
   */
  _renderExportArtwork(mult = 1, includeFrame = false) {
    const artCanvas = document.createElement("canvas");
    if (mult === 1) {
      this.engine.render(artCanvas, this.params, "result");
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

      // Transfer AI subject mask if active
      if (this.engine.aiSubjectMask && tempEngine.width && tempEngine.height) {
        const scaledAIMask = this._resampleMask(
          this.engine.aiSubjectMask,
          this.engine.width,
          this.engine.height,
          tempEngine.width,
          tempEngine.height
        );
        tempEngine.setAISubjectMask(scaledAIMask);
      }

      // Transfer user brush mask if active
      if (this.engine.userBrushMask && tempEngine.userBrushMask) {
        const scaledBrush = this._resampleMask(
          this.engine.userBrushMask,
          this.engine.width,
          this.engine.height,
          tempEngine.width,
          tempEngine.height
        );
        tempEngine.userBrushMask.set(scaledBrush);
      }

      tempEngine.render(artCanvas, this.params, "result");
    }

    if (includeFrame && this.currentFrame !== "none") {
      return this._compositeFrame(artCanvas, this.currentFrame, mult);
    }
    return artCanvas;
  }

  /**
   * Bilinear resampling for mask buffers during multi-scale export.
   * @private
   */
  _resampleMask(srcMask, sw, sh, dw, dh) {
    const dst = new Float32Array(dw * dh);
    const xRatio = (sw - 1) / Math.max(1, dw - 1);
    const yRatio = (sh - 1) / Math.max(1, dh - 1);

    for (let dy = 0; dy < dh; dy++) {
      const sy = Math.min(sh - 1, dy * yRatio);
      const y0 = Math.floor(sy);
      const y1 = Math.min(sh - 1, y0 + 1);
      const fy = sy - y0;

      for (let dx = 0; dx < dw; dx++) {
        const sx = Math.min(sw - 1, dx * xRatio);
        const x0 = Math.floor(sx);
        const x1 = Math.min(sw - 1, x0 + 1);
        const fx = sx - x0;

        const v00 = srcMask[y0 * sw + x0];
        const v10 = srcMask[y0 * sw + x1];
        const v01 = srcMask[y1 * sw + x0];
        const v11 = srcMask[y1 * sw + x1];

        const top = v00 * (1 - fx) + v10 * fx;
        const bottom = v01 * (1 - fx) + v11 * fx;
        dst[dy * dw + dx] = top * (1 - fy) + bottom * fy;
      }
    }
    return dst;
  }

  /**
   * Composites wooden moulding, archival mat board, and bevel shadows around the artwork.
   * @private
   */
  _compositeFrame(artCanvas, frameStyle, mult = 1) {
    const artW = artCanvas.width;
    const artH = artCanvas.height;
    const minDim = Math.min(artW, artH);
    const matW = Math.round(minDim * 0.05);
    const frameW = Math.round(minDim * 0.032);
    const border = matW + frameW;

    const totalW = artW + border * 2;
    const totalH = artH + border * 2;

    const framedCanvas = document.createElement("canvas");
    framedCanvas.width = totalW;
    framedCanvas.height = totalH;
    const ctx = framedCanvas.getContext("2d");

    // 1. Draw frame moulding outer border
    if (frameStyle === "oak") {
      ctx.fillStyle = "#b58d59";
      ctx.fillRect(0, 0, totalW, totalH);

      // Subtle oak grain variations
      const grainGrad = ctx.createLinearGradient(0, 0, totalW, totalH);
      grainGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      grainGrad.addColorStop(0.5, "rgba(0, 0, 0, 0.05)");
      grainGrad.addColorStop(1, "rgba(255, 255, 255, 0.06)");
      ctx.fillStyle = grainGrad;
      ctx.fillRect(0, 0, totalW, totalH);

      // Top bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(totalW, 0);
      ctx.lineTo(totalW - frameW, frameW);
      ctx.lineTo(frameW, frameW);
      ctx.closePath();
      ctx.fill();

      // Left bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(frameW, frameW);
      ctx.lineTo(frameW, totalH - frameW);
      ctx.lineTo(0, totalH);
      ctx.closePath();
      ctx.fill();

      // Bottom bevel
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, totalH);
      ctx.lineTo(frameW, totalH - frameW);
      ctx.lineTo(totalW - frameW, totalH - frameW);
      ctx.lineTo(totalW, totalH);
      ctx.closePath();
      ctx.fill();

      // Right bevel
      ctx.fillStyle = "rgba(0, 0, 0, 0.20)";
      ctx.beginPath();
      ctx.moveTo(totalW, 0);
      ctx.lineTo(totalW, totalH);
      ctx.lineTo(totalW - frameW, totalH - frameW);
      ctx.lineTo(totalW - frameW, frameW);
      ctx.closePath();
      ctx.fill();

      // Inner moulding lip
      ctx.strokeStyle = "#8a6233";
      ctx.lineWidth = Math.max(1, Math.round(2 * mult));
      ctx.strokeRect(frameW, frameW, totalW - 2 * frameW, totalH - 2 * frameW);
    } else if (frameStyle === "white") {
      ctx.fillStyle = "#f2eee9";
      ctx.fillRect(0, 0, totalW, totalH);

      // Top bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(totalW, 0);
      ctx.lineTo(totalW - frameW, frameW);
      ctx.lineTo(frameW, frameW);
      ctx.closePath();
      ctx.fill();

      // Left bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(frameW, frameW);
      ctx.lineTo(frameW, totalH - frameW);
      ctx.lineTo(0, totalH);
      ctx.closePath();
      ctx.fill();

      // Bottom bevel
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, totalH);
      ctx.lineTo(frameW, totalH - frameW);
      ctx.lineTo(totalW - frameW, totalH - frameW);
      ctx.lineTo(totalW, totalH);
      ctx.closePath();
      ctx.fill();

      // Right bevel
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.beginPath();
      ctx.moveTo(totalW, 0);
      ctx.lineTo(totalW, totalH);
      ctx.lineTo(totalW - frameW, totalH - frameW);
      ctx.lineTo(totalW - frameW, frameW);
      ctx.closePath();
      ctx.fill();

      // Inner moulding lip
      ctx.strokeStyle = "#ded9d0";
      ctx.lineWidth = Math.max(1, Math.round(2 * mult));
      ctx.strokeRect(frameW, frameW, totalW - 2 * frameW, totalH - 2 * frameW);
    } else {
      // Default: Black
      ctx.fillStyle = "#18191c";
      ctx.fillRect(0, 0, totalW, totalH);

      // Top bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(totalW, 0);
      ctx.lineTo(totalW - frameW, frameW);
      ctx.lineTo(frameW, frameW);
      ctx.closePath();
      ctx.fill();

      // Left bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(frameW, frameW);
      ctx.lineTo(frameW, totalH - frameW);
      ctx.lineTo(0, totalH);
      ctx.closePath();
      ctx.fill();

      // Bottom bevel
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.beginPath();
      ctx.moveTo(0, totalH);
      ctx.lineTo(frameW, totalH - frameW);
      ctx.lineTo(totalW - frameW, totalH - frameW);
      ctx.lineTo(totalW, totalH);
      ctx.closePath();
      ctx.fill();

      // Right bevel
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.moveTo(totalW, 0);
      ctx.lineTo(totalW, totalH);
      ctx.lineTo(totalW - frameW, totalH - frameW);
      ctx.lineTo(totalW - frameW, frameW);
      ctx.closePath();
      ctx.fill();

      // Inner moulding lip
      ctx.strokeStyle = "#2c2d32";
      ctx.lineWidth = Math.max(1, Math.round(2 * mult));
      ctx.strokeRect(frameW, frameW, totalW - 2 * frameW, totalH - 2 * frameW);
    }

    // 2. Draw archival mat board
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(frameW, frameW, totalW - 2 * frameW, totalH - 2 * frameW);

    // 3. Draw artwork in the center aperture
    ctx.drawImage(artCanvas, border, border, artW, artH);

    // 4. Draw 45-degree beveled mat aperture inner shadow
    const bevelDepth = Math.max(3, Math.round(7 * mult));

    // Top aperture shadow
    const topShadow = ctx.createLinearGradient(0, border, 0, border + bevelDepth);
    topShadow.addColorStop(0, "rgba(0, 0, 0, 0.35)");
    topShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = topShadow;
    ctx.fillRect(border, border, artW, bevelDepth);

    // Left aperture shadow
    const leftShadow = ctx.createLinearGradient(border, 0, border + bevelDepth, 0);
    leftShadow.addColorStop(0, "rgba(0, 0, 0, 0.25)");
    leftShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = leftShadow;
    ctx.fillRect(border, border, bevelDepth, artH);

    // Subtle bottom & right bevel highlights
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = Math.max(1, Math.round(1.5 * mult));
    ctx.beginPath();
    ctx.moveTo(border, border + artH);
    ctx.lineTo(border + artW, border + artH);
    ctx.lineTo(border + artW, border);
    ctx.stroke();

    return framedCanvas;
  }

  /**
   * Directly copies the artwork to the system clipboard as a PNG image.
   * Gracefully falls back to file download if clipboard permissions fail.
   * @param {HTMLCanvasElement} canvas
   */
  async copyArtworkToClipboard(canvas) {
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.write !== "function" ||
        typeof window.ClipboardItem === "undefined"
      ) {
        throw new Error("ClipboardItem API not supported");
      }

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob creation failed"))),
          "image/png"
        );
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      this.showToast(
        `Copied ${canvas.width}×${canvas.height} artwork to clipboard!`
      );
    } catch (err) {
      console.warn("Clipboard copy unavailable, falling back to download:", err);
      const filename = `splashcanvas-${this.currentPresetId}-${canvas.width}x${canvas.height}.png`;
      this._downloadCanvas(canvas, "image/png", 1.0, filename);
      this.showToast(
        "Clipboard copy unavailable — downloaded image file instead"
      );
    }
  }

  /**
   * Downloads a canvas image file.
   * @private
   */
  _downloadCanvas(canvas, mimeType, quality, filename) {
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = filename;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          this.showToast(`Exported ${canvas.width}×${canvas.height} print`);
        },
        mimeType,
        quality
      );
    } else {
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL(mimeType, quality);
      link.click();
      this.showToast(`Exported ${canvas.width}×${canvas.height} print`);
    }
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
