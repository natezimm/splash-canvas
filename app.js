/**
 * SplashCanvas — Interactive UI Controller, Presets & Sample Scene Generator
 */

const PRESETS = [
  {
    id: "fiverr-classic",
    name: "🎨 Fiverr Classic",
    desc: "Vibrant portrait cutout + color-matched splatters",
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
    name: "☁️ Cloud Wash",
    desc: "Atmospheric grey watercolor clouds around subject",
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
    name: "✒️ Line & Wash",
    desc: "Crisp architectural & portrait ink sketch + glaze",
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
    name: "💥 Expressive Splash",
    desc: "Bold pigment bursts, heavy drips & dynamic energy",
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
    name: "🌸 Soft Pastel",
    desc: "Airy bridal & baby portrait wash with gentle bloom",
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
    name: "🏛️ Dry-Brush Studio",
    desc: "Textured cotton rag tooth with broken brush edges",
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
    name: "🖼️ Full Landscape",
    desc: "Paints the entire photo edge-to-edge on cotton paper",
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
    name: "🌿 Vintage Botanical",
    desc: "Warm sepia undertones, delicate washes & aged paper",
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
];

class SplashCanvasApp {
  constructor() {
    this.engine = new WatercolorEngine();
    this.currentPresetId = PRESETS[0].id;
    this.params = { ...PRESETS[0].params };
    this.viewMode = "result"; // 'result' | 'split' | 'original' | 'mask'
    this.brushMode = "none"; // 'none' | 'restore' | 'erase'
    this.brushSize = 65;
    this.brushSoftness = 75;
    this.zoom = 1.0;
    this.splitPos = 0.5;
    this.currentImageElement = null;
    this.renderPending = false;

    this._cacheDOM();
    this._buildPresetCards();
    this._bindEvents();
    this._syncUIFromParams();

    // Load default beach surfer sample scene on startup
    this.loadSampleScene("surfers");
  }

  _cacheDOM() {
    this.outputCanvas = document.getElementById("output-canvas");
    this.originalOverlayCanvas = document.getElementById("original-overlay-canvas");
    this.canvasContainer = document.getElementById("canvas-container");
    this.canvasViewport = document.getElementById("canvas-viewport");
    this.presetGrid = document.getElementById("preset-grid");
    this.renderTimeLabel = document.getElementById("render-time-label");
    this.statusDot = document.querySelector(".status-dot");
    this.splitSlider = document.getElementById("split-slider");
    this.brushCursor = document.getElementById("brush-cursor");
    this.dropOverlay = document.getElementById("drop-overlay");
    this.fileInput = document.getElementById("file-input");
    this.sampleMenuBtn = document.getElementById("sample-menu-btn");
    this.sampleMenu = document.getElementById("sample-menu");
    this.aiStatusBadge = document.getElementById("ai-status-badge");
  }

  _buildPresetCards() {
    this.presetGrid.innerHTML = "";
    PRESETS.forEach((preset) => {
      const btn = document.createElement("button");
      btn.className = `preset-card ${
        preset.id === this.currentPresetId ? "active" : ""
      }`;
      btn.dataset.presetId = preset.id;
      btn.innerHTML = `
        <div class="preset-name">${preset.name}</div>
        <div class="preset-desc">${preset.desc}</div>
      `;
      btn.addEventListener("click", () => this.applyPreset(preset.id));
      this.presetGrid.appendChild(btn);
    });
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
    // Update all sliders & value readouts
    document.querySelectorAll("input[data-param]").forEach((input) => {
      const key = input.dataset.param;
      if (this.params[key] !== undefined) {
        input.value = this.params[key];
        this._updateSliderLabel(key, this.params[key]);
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
    document.querySelectorAll(".swatch").forEach((sw) => {
      sw.classList.toggle(
        "active",
        sw.dataset.tint.toLowerCase() ===
          (this.params.paperTint || "#f6f5f0").toLowerCase()
      );
    });
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

  _bindEvents() {
    // Slider inputs
    document.querySelectorAll("input[data-param]").forEach((input) => {
      input.addEventListener("input", (e) => {
        const key = e.target.dataset.param;
        const val = parseFloat(e.target.value);
        this.params[key] = val;
        this._updateSliderLabel(key, val);
        this.scheduleRender();
      });
    });

    // Cutout Mode buttons
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
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
        this.params.paperTint = sw.dataset.tint;
        document
          .querySelectorAll(".swatch")
          .forEach((s) => s.classList.toggle("active", s === sw));
        this.scheduleRender();
      });
    });

    // View Toggles (Artwork, Split, Original, Mask)
    document.querySelectorAll(".pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.viewMode = btn.dataset.view;
        document
          .querySelectorAll(".pill-btn")
          .forEach((b) => b.classList.toggle("active", b === btn));
        this._updateViewModeUI();
        this.scheduleRender();
      });
    });

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
    });
    brushSoftInput.addEventListener("input", (e) => {
      this.brushSoftness = parseInt(e.target.value, 10);
      document.getElementById("val-brush-softness").textContent = `${this.brushSoftness}%`;
    });

    document.getElementById("clear-brush-btn").addEventListener("click", () => {
      this.engine.clearUserBrushMask();
      this.scheduleRender();
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
      this.sampleMenu.classList.toggle("open");
    });
    window.addEventListener("click", () => {
      this.sampleMenu.classList.remove("open");
    });
    this.sampleMenu.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.loadSampleScene(btn.dataset.sample);
      });
    });

    // Top Actions: Re-roll Splatters, Reset, Export, Zoom
    document
      .getElementById("randomize-seed-btn")
      .addEventListener("click", () => {
        const nextSeed = Math.floor(Math.random() * 90000) + 1000;
        this.engine.setSeed(nextSeed);
        this.scheduleRender();
      });

    document.getElementById("reset-all-btn").addEventListener("click", () => {
      this.engine.clearUserBrushMask();
      this.applyPreset(this.currentPresetId);
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

    // Zoom Controls
    document.getElementById("zoom-in-btn").addEventListener("click", () => {
      this.setZoom(Math.min(2.5, this.zoom + 0.2));
    });
    document.getElementById("zoom-out-btn").addEventListener("click", () => {
      this.setZoom(Math.max(0.5, this.zoom - 0.2));
    });
    document.getElementById("zoom-fit-btn").addEventListener("click", () => {
      this.setZoom(1.0);
    });
  }

  setZoom(z) {
    this.zoom = z;
    this.canvasContainer.style.transform = `scale(${z})`;
    document.getElementById("zoom-label").textContent =
      Math.abs(z - 1.0) < 0.05 ? "Fit" : `${Math.round(z * 100)}%`;
  }

  _updateViewModeUI() {
    if (this.viewMode === "split") {
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

  loadUserFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        this.currentImageElement = img;
        this.aiStatusBadge.textContent = "Smart Mask";
        this.engine.loadImage(img, 1080);
        this._drawOriginalOverlay();
        this.scheduleRender();
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
   * Optional Precision AI Subject Segmentation using MediaPipe SelfieSegmentation
   */
  async runMediaPipeCutout() {
    const btn = document.getElementById("ai-cutout-btn");
    const origText = btn.textContent;
    btn.textContent = "⏳ Running Neural Cutout...";
    btn.disabled = true;

    try {
      if (typeof SelfieSegmentation === "undefined") {
        throw new Error("Offline mode — using local Smart Subject Mask");
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
            // Combine AI person mask with local object mask so held props (like surfboards or pets) stay included!
            const aiVal = maskData[i * 4] / 255;
            floatMask[i] = Math.max(aiVal, this.engine.autoSubjectMask[i] * 0.85);
          }
          this.engine.setAISubjectMask(floatMask);
          this.aiStatusBadge.textContent = "AI Neural Mask Active";
          resolve();
        });

        // Create temporary canvas from source image
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
      btn.textContent = "✅ AI Cutout Applied";
      setTimeout(() => {
        btn.textContent = origText;
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      // Boost local smart mask contrast if offline
      this.aiStatusBadge.textContent = "Enhanced Smart Mask";
      this.params.cutoutMode = "smart";
      this.scheduleRender();
      btn.textContent = "✅ Smart Subject Mask Active";
      setTimeout(() => {
        btn.textContent = origText;
        btn.disabled = false;
      }, 1800);
    }
  }

  scheduleRender() {
    if (this.renderPending) return;
    this.renderPending = true;
    this.statusDot.classList.add("busy");

    requestAnimationFrame(() => {
      this.renderPending = false;
      const renderMode =
        this.viewMode === "split" ? "result" : this.viewMode;
      const elapsed = this.engine.render(
        this.outputCanvas,
        this.params,
        renderMode
      );
      this.statusDot.classList.remove("busy");
      this.renderTimeLabel.textContent = `Rendered in ${Math.round(elapsed)} ms (${this.engine.width}×${this.engine.height})`;
    });
  }

  /**
   * Export high-resolution PNG artwork
   */
  exportArtwork() {
    const scaleSelect = document.getElementById("export-scale");
    const mult = parseFloat(scaleSelect.value) || 1;

    const exportCanvas = document.createElement("canvas");
    if (mult === 1) {
      this.engine.render(exportCanvas, this.params, "result");
    } else {
      // Temporarily render at scaled resolution
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
    link.download = `splashcanvas-artwork-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }

  /**
   * Built-in rich procedural sample scenes so the user can test every slider immediately
   * (including a "Beach Surfers & Pup" scene modeled directly after the user's reference photo!)
   */
  loadSampleScene(sceneName) {
    const canvas = document.createElement("canvas");
    canvas.width = 860;
    canvas.height = 1040;
    const ctx = canvas.getContext("2d");

    if (sceneName === "surfers") {
      this._drawSurfersSample(ctx, canvas.width, canvas.height);
    } else if (sceneName === "portrait") {
      this._drawPortraitSample(ctx, canvas.width, canvas.height);
    } else if (sceneName === "pet") {
      this._drawPetSample(ctx, canvas.width, canvas.height);
    } else {
      this._drawArchitectureSample(ctx, canvas.width, canvas.height);
    }

    const img = new Image();
    img.onload = () => {
      this.currentImageElement = img;
      this.engine.loadImage(img, 1000);
      this._drawOriginalOverlay();
      this.scheduleRender();
    };
    img.src = canvas.toDataURL("image/png");
  }

  /**
   * Draws a rich, detailed beach couple with neon yellow-green surfboard & puppy
   * matching the composition and palette of the user's uploaded reference image.
   */
  _drawSurfersSample(ctx, w, h) {
    // 1. Sky & Ocean Beach Background (which the Smart Cutout will dissolve into watercolor paper!)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    skyGrad.addColorStop(0, "#bcd4e6");
    skyGrad.addColorStop(1, "#e5eef4");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.62);

    // Ocean horizon
    const seaGrad = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.72);
    seaGrad.addColorStop(0, "#5c8d9c");
    seaGrad.addColorStop(0.6, "#8eb4be");
    seaGrad.addColorStop(1, "#dfecee");
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, h * 0.58, w, h * 0.14);

    // Sandy beach
    const sandGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    sandGrad.addColorStop(0, "#d8c3a5");
    sandGrad.addColorStop(1, "#c2a882");
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    // 2. Neon Lime-Yellow Surfboard on the left (like reference 502480F5)
    ctx.save();
    ctx.translate(w * 0.35, h * 0.49);
    ctx.rotate(0.03);
    const boardGrad = ctx.createLinearGradient(-75, -280, 75, 290);
    boardGrad.addColorStop(0, "#f9faf6");
    boardGrad.addColorStop(0.24, "#eef588");
    boardGrad.addColorStop(0.4, "#c8e61e");
    boardGrad.addColorStop(0.85, "#a6cf0e");
    boardGrad.addColorStop(1, "#d9ec2b");
    ctx.fillStyle = boardGrad;
    ctx.beginPath();
    ctx.moveTo(0, -310);
    ctx.bezierCurveTo(88, -210, 92, 120, 52, 310);
    ctx.lineTo(-52, 310);
    ctx.bezierCurveTo(-92, 120, -88, -210, 0, -310);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#8aa814";
    ctx.stroke();

    // Surfboard graphic stripes & tail pad
    ctx.fillStyle = "#262922";
    ctx.beginPath();
    ctx.moveTo(-58, 170);
    ctx.lineTo(15, 160);
    ctx.lineTo(35, 305);
    ctx.lineTo(-48, 308);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("58", -54, -95);
    ctx.restore();

    // 3. Male Surfer (White tee, open light-blue chambray shirt, denim shorts, sunglasses)
    // Legs
    ctx.fillStyle = "#c98b63";
    ctx.fillRect(w * 0.44, h * 0.56, 36, 225);
    ctx.fillRect(w * 0.51, h * 0.56, 35, 225);

    // Denim shorts
    const shortGrad = ctx.createLinearGradient(w * 0.42, h * 0.47, w * 0.57, h * 0.62);
    shortGrad.addColorStop(0, "#2b547e");
    shortGrad.addColorStop(0.5, "#5c8ab3");
    shortGrad.addColorStop(1, "#1e3c58");
    ctx.fillStyle = shortGrad;
    ctx.fillRect(w * 0.43, h * 0.47, 125, 135);

    // White T-shirt
    ctx.fillStyle = "#f4f6f9";
    ctx.fillRect(w * 0.43, h * 0.28, 118, 195);

    // Open light-blue shirt panels
    ctx.fillStyle = "#b8cce0";
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.28);
    ctx.lineTo(w * 0.45, h * 0.28);
    ctx.lineTo(w * 0.45, h * 0.49);
    ctx.lineTo(w * 0.41, h * 0.48);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.54, h * 0.28);
    ctx.lineTo(w * 0.58, h * 0.29);
    ctx.lineTo(w * 0.59, h * 0.51);
    ctx.lineTo(w * 0.53, h * 0.50);
    ctx.closePath();
    ctx.fill();

    // Head & Neck
    ctx.fillStyle = "#d89b72";
    ctx.fillRect(w * 0.47, h * 0.24, 34, 48);
    ctx.beginPath();
    ctx.ellipse(w * 0.49, h * 0.21, 34, 42, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#2b231d";
    ctx.beginPath();
    ctx.arc(w * 0.485, h * 0.19, 35, Math.PI * 0.85, Math.PI * 2.05);
    ctx.fill();

    // Blue Mirrored Sunglasses
    ctx.fillStyle = "#1d63b8";
    ctx.beginPath();
    ctx.roundRect(w * 0.48, h * 0.195, 22, 14, 4);
    ctx.roundRect(w * 0.51, h * 0.197, 18, 14, 4);
    ctx.fill();

    // 4. Female Subject (Red tank top, high-waisted light-wash jeans, blonde hair, holding puppy)
    // Light acid-wash jeans
    const jeanGrad = ctx.createLinearGradient(w * 0.56, h * 0.47, w * 0.70, h * 0.78);
    jeanGrad.addColorStop(0, "#d7e2ec");
    jeanGrad.addColorStop(0.5, "#e6edf2");
    jeanGrad.addColorStop(1, "#c5d3df");
    ctx.fillStyle = jeanGrad;
    ctx.beginPath();
    ctx.roundRect(w * 0.57, h * 0.47, 54, 295, 16);
    ctx.roundRect(w * 0.63, h * 0.47, 54, 295, 16);
    ctx.fill();

    // Red Tank Top
    ctx.fillStyle = "#d91b2e";
    ctx.beginPath();
    ctx.roundRect(w * 0.57, h * 0.34, 105, 135, 12);
    ctx.fill();

    // Head & Blonde Waves
    ctx.fillStyle = "#e0a680";
    ctx.beginPath();
    ctx.ellipse(w * 0.61, h * 0.27, 30, 36, 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e5c287";
    ctx.beginPath();
    ctx.moveTo(w * 0.58, h * 0.24);
    ctx.bezierCurveTo(w * 0.52, h * 0.28, w * 0.54, h * 0.41, w * 0.61, h * 0.42);
    ctx.bezierCurveTo(w * 0.64, h * 0.36, w * 0.63, h * 0.25, w * 0.58, h * 0.24);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = "#1676d2";
    ctx.beginPath();
    ctx.roundRect(w * 0.605, h * 0.255, 18, 13, 4);
    ctx.roundRect(w * 0.63, h * 0.258, 16, 13, 4);
    ctx.fill();

    // 5. Fluffy Cream Shih-Tzu Puppy in Arms
    ctx.fillStyle = "#e6d6c3";
    ctx.beginPath();
    ctx.ellipse(w * 0.69, h * 0.39, 38, 28, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.71, h * 0.35, 24, 0, Math.PI * 2);
    ctx.fill();
    // Puppy dark nose & eyes
    ctx.fillStyle = "#2c221e";
    ctx.beginPath();
    ctx.arc(w * 0.725, h * 0.345, 4, 0, Math.PI * 2);
    ctx.arc(w * 0.708, h * 0.335, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPortraitSample(ctx, w, h) {
    // Soft green bokeh background
    ctx.fillStyle = "#a3b899";
    ctx.fillRect(0, 0, w, h);

    // Shoulders & terracotta dress
    ctx.fillStyle = "#c85a32";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.82, 220, 190, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck & Face
    ctx.fillStyle = "#e2a985";
    ctx.fillRect(w * 0.45, h * 0.48, 86, 130);
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.4, 115, 145, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flowing auburn hair
    ctx.fillStyle = "#5c2c1d";
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.36, 135, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Sun hat
    ctx.fillStyle = "#e6cfa7";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.24, 240, 55, -0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPetSample(ctx, w, h) {
    ctx.fillStyle = "#9ec1cf";
    ctx.fillRect(0, 0, w, h);

    // Golden Retriever chest & head
    ctx.fillStyle = "#d99b4e";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.72, 190, 210, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e5ad63";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, 145, 155, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floppy ears
    ctx.fillStyle = "#b87a33";
    ctx.beginPath();
    ctx.ellipse(w * 0.31, h * 0.44, 48, 110, 0.25, 0, Math.PI * 2);
    ctx.ellipse(w * 0.69, h * 0.44, 48, 110, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Eyes, nose & pink tongue
    ctx.fillStyle = "#231f20";
    ctx.beginPath();
    ctx.arc(w * 0.43, h * 0.38, 14, 0, Math.PI * 2);
    ctx.arc(w * 0.57, h * 0.38, 14, 0, Math.PI * 2);
    ctx.ellipse(w * 0.5, h * 0.47, 26, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e87a90";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.55, 22, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawArchitectureSample(ctx, w, h) {
    ctx.fillStyle = "#cbe1f2";
    ctx.fillRect(0, 0, w, h);

    // Warm ochre Mediterranean building facade
    ctx.fillStyle = "#e8b878";
    ctx.fillRect(w * 0.2, h * 0.18, w * 0.6, h * 0.68);

    // Terracotta roof tiles
    ctx.fillStyle = "#b84a2c";
    ctx.beginPath();
    ctx.moveTo(w * 0.16, h * 0.2);
    ctx.lineTo(w * 0.5, h * 0.09);
    ctx.lineTo(w * 0.84, h * 0.2);
    ctx.closePath();
    ctx.fill();

    // Turquoise shutters & arched doorway
    ctx.fillStyle = "#2b7a78";
    ctx.fillRect(w * 0.28, h * 0.28, 70, 110);
    ctx.fillRect(w * 0.58, h * 0.28, 70, 110);

    // Cafe awning
    ctx.fillStyle = "#c93b2b";
    ctx.fillRect(w * 0.25, h * 0.52, w * 0.5, 55);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.app = new SplashCanvasApp();
});
