/* UI wiring. */
(function () {
  "use strict";

  const App = window.App;
  const $ = (id) => document.getElementById(id);

  const els = {
    fileInput: $("file-input"),
    dropzone: $("dropzone"),
    stage: $("stage"),
    viewport: $("viewport"),
    view: $("view"),
    cropLayer: $("crop-layer"),
    cropBox: $("crop-box"),
    btnOpen: $("btn-open"),
    btnReset: $("btn-reset"),
    btnDownload: $("btn-download"),
    cropRatio: $("crop-ratio"),
    cropStart: $("crop-start"),
    cropApply: $("crop-apply"),
    cropClear: $("crop-clear"),
    rsW: $("rs-w"),
    rsH: $("rs-h"),
    rsLock: $("rs-lock"),
    wmEnabled: $("wm-enabled"),
    wmOptions: $("wm-options"),
    wmPreview: $("wm-preview"),
    wmText: $("wm-text"),
    wmStyle: $("wm-style"),
    wmGrid: $("wm-grid"),
    wmSize: $("wm-size"),
    outWmSize: $("out-wm-size"),
    wmOpacity: $("wm-opacity"),
    outWmOpacity: $("out-wm-opacity"),
    wmCaption: $("wm-caption"),
    wmCaptionField: $("wm-caption-field"),
    wmCaptionText: $("wm-caption-text"),
    exFormat: $("ex-format"),
    exQuality: $("ex-quality"),
    qualityField: $("quality-field"),
    outQuality: $("out-quality"),
    sizeInfo: $("size-info"),
  };

  const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  let baseAspect = 1;

  App.Crop.init({ layer: els.cropLayer, box: els.cropBox });
  App.Crop.onApply = () => {
    syncResizeInputs();
    render();
  };

  // ---------- loading ----------
  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      App.state = Object.assign(App.state, { originalImage: img });
      App.resetState();
      App.state.fileName = (file.name || "bild").replace(/\.[^.]+$/, "") || "bild";
      els.dropzone.hidden = true;
      els.viewport.hidden = false;
      els.btnReset.disabled = false;
      els.btnDownload.disabled = false;
      App.Crop.exit();
      showCropButtons(false);
      resetAdjustUI();
      syncWatermarkUI();
      syncResizeInputs();
      render();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Dieses Bild konnte nicht geladen werden.");
    };
    img.src = url;
  }

  els.btnOpen.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", (e) => loadFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((ev) =>
    els.stage.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropzone.classList.add("drag");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    els.stage.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropzone.classList.remove("drag");
    })
  );
  els.stage.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  });
  window.addEventListener("paste", (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) loadFile(item.getAsFile());
  });

  // ---------- rendering ----------
  function fitInto(w, h) {
    const pad = 48;
    const maxW = els.stage.clientWidth - pad;
    const maxH = els.stage.clientHeight - pad;
    const scale = Math.max(0.02, Math.min(1, maxW / w, maxH / h));
    return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
  }

  function render() {
    if (!App.state.originalImage) return;
    const src = App.Crop.active ? App.transformedCanvas() : App.composeCanvas();
    const fit = fitInto(src.width, src.height);
    els.view.width = src.width;
    els.view.height = src.height;
    els.view.style.width = fit.w + "px";
    els.view.style.height = fit.h + "px";
    els.view.getContext("2d").drawImage(src, 0, 0);
    App.Crop.reflow();
    updateSizeInfo();
  }

  function updateSizeInfo() {
    const s = App.outputSize();
    els.sizeInfo.textContent = `${s.w} × ${s.h} px · ${EXT[App.state.format].toUpperCase()}`;
  }

  window.addEventListener("resize", render);

  // ---------- transform ----------
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = App.state;
      switch (btn.dataset.action) {
        case "rotate-left":
          s.rotation = (s.rotation + 270) % 360;
          s.crop = null;
          break;
        case "rotate-right":
          s.rotation = (s.rotation + 90) % 360;
          s.crop = null;
          break;
        case "flip-h":
          s.flipH = !s.flipH;
          if (s.crop) {
            const t = App.transformedCanvas();
            s.crop.x = t.width - s.crop.x - s.crop.w;
          }
          break;
        case "flip-v":
          s.flipV = !s.flipV;
          if (s.crop) {
            const t = App.transformedCanvas();
            s.crop.y = t.height - s.crop.y - s.crop.h;
          }
          break;
        case "reset-adjust":
          s.adjust = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0 };
          resetAdjustUI();
          break;
      }
      syncResizeInputs();
      render();
      if (App.Crop.active) App.Crop.enter(); // recompute selection against new dimensions
    });
  });

  // ---------- crop ----------
  els.cropRatio.addEventListener("change", () => App.Crop.setRatio(els.cropRatio.value));

  els.cropStart.addEventListener("click", () => {
    App.Crop.setRatio(els.cropRatio.value);
    App.Crop.active = true; // make render() draw the full (uncropped) transformed image
    render();
    App.Crop.enter(); // layout is now correct -> initialise the selection rectangle
    showCropButtons(true);
  });
  els.cropApply.addEventListener("click", () => {
    App.Crop.apply();
    showCropButtons(false);
  });
  els.cropClear.addEventListener("click", () => {
    App.Crop.clearCrop();
    showCropButtons(false);
  });

  function showCropButtons(cropping) {
    els.cropApply.hidden = !cropping;
    els.cropClear.hidden = !cropping;
    els.cropStart.hidden = cropping;
  }

  // ---------- adjustments ----------
  const ADJ = ["brightness", "contrast", "saturate", "grayscale"];
  ADJ.forEach((key) => {
    const input = $("adj-" + key);
    const out = $("out-" + key);
    input.addEventListener("input", () => {
      App.state.adjust[key] = Number(input.value);
      out.textContent = input.value + "%";
      render();
    });
  });

  function resetAdjustUI() {
    ADJ.forEach((key) => {
      const val = App.state.adjust[key];
      $("adj-" + key).value = val;
      $("out-" + key).textContent = val + "%";
    });
  }

  // ---------- resize ----------
  function syncResizeInputs() {
    const s = App.outputSize();
    els.rsW.value = s.w;
    els.rsH.value = s.h;
    baseAspect = s.w / s.h;
  }

  function applyResizeFrom(which) {
    let w = Math.max(1, Math.round(Number(els.rsW.value) || 0));
    let h = Math.max(1, Math.round(Number(els.rsH.value) || 0));
    if (els.rsLock.checked) {
      if (which === "w") h = Math.max(1, Math.round(w / baseAspect));
      else w = Math.max(1, Math.round(h * baseAspect));
      els.rsW.value = w;
      els.rsH.value = h;
    }
    App.state.resize = { w, h };
    render();
  }
  els.rsW.addEventListener("change", () => applyResizeFrom("w"));
  els.rsH.addEventListener("change", () => applyResizeFrom("h"));

  // ---------- KI-Wasserzeichen ----------
  function drawWatermarkPreview() {
    const c = els.wmPreview;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    // Neutraler Foto-Ersatz, damit helle wie dunkle Varianten beurteilbar sind.
    const bg = ctx.createLinearGradient(0, 0, c.width, c.height);
    bg.addColorStop(0, "#3f4642");
    bg.addColorStop(1, "#8d968a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);

    const wm = App.state.watermark;
    const mark = App.Watermark.renderMark(c.height * 0.62, wm);
    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, wm.opacity / 100));
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = c.height * 0.045;
    ctx.shadowOffsetY = c.height * 0.012;
    ctx.drawImage(mark, (c.width - mark.width) / 2, (c.height - mark.height) / 2);
    ctx.restore();
  }

  function syncWatermarkUI() {
    const wm = App.state.watermark;
    els.wmEnabled.checked = wm.enabled;
    els.wmOptions.hidden = !wm.enabled;
    els.wmText.value = wm.text;
    els.wmStyle.value = wm.style;
    els.wmSize.value = wm.size;
    els.outWmSize.textContent = wm.size + "%";
    els.wmOpacity.value = wm.opacity;
    els.outWmOpacity.textContent = wm.opacity + "%";
    els.wmCaption.checked = wm.caption;
    els.wmCaptionText.value = wm.captionText;
    els.wmCaptionField.hidden = !wm.caption;
    [...els.wmGrid.children].forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.pos === wm.position))
    );
    if (wm.enabled) drawWatermarkPreview();
  }

  function updateWatermark(patch) {
    Object.assign(App.state.watermark, patch);
    syncWatermarkUI();
    render();
  }

  els.wmEnabled.addEventListener("change", () => updateWatermark({ enabled: els.wmEnabled.checked }));
  els.wmText.addEventListener("change", () => updateWatermark({ text: els.wmText.value }));
  els.wmStyle.addEventListener("change", () => updateWatermark({ style: els.wmStyle.value }));
  els.wmSize.addEventListener("input", () => updateWatermark({ size: Number(els.wmSize.value) }));
  els.wmOpacity.addEventListener("input", () => updateWatermark({ opacity: Number(els.wmOpacity.value) }));
  els.wmCaption.addEventListener("change", () => updateWatermark({ caption: els.wmCaption.checked }));
  els.wmCaptionText.addEventListener("input", () =>
    updateWatermark({ captionText: els.wmCaptionText.value })
  );
  els.wmGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-pos]");
    if (btn) updateWatermark({ position: btn.dataset.pos });
  });

  // ---------- export ----------
  function refreshQualityField() {
    const isPng = els.exFormat.value === "image/png";
    els.qualityField.hidden = isPng;
  }
  els.exFormat.addEventListener("change", () => {
    App.state.format = els.exFormat.value;
    refreshQualityField();
    updateSizeInfo();
  });
  els.exQuality.addEventListener("input", () => {
    App.state.quality = Number(els.exQuality.value) / 100;
    els.outQuality.textContent = els.exQuality.value + "%";
  });

  els.btnDownload.addEventListener("click", async () => {
    try {
      els.btnDownload.disabled = true;
      const blob = await App.exportBlob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${App.state.fileName}-bearbeitet.${EXT[App.state.format]}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      alert("Export fehlgeschlagen: " + err.message);
    } finally {
      els.btnDownload.disabled = false;
    }
  });

  // ---------- reset ----------
  els.btnReset.addEventListener("click", () => {
    if (!App.state.originalImage) return;
    App.resetState();
    App.Crop.exit();
    showCropButtons(false);
    els.cropRatio.value = "free";
    els.exFormat.value = "image/png";
    els.exQuality.value = 92;
    els.outQuality.textContent = "92%";
    refreshQualityField();
    resetAdjustUI();
    syncWatermarkUI();
    syncResizeInputs();
    render();
  });

  refreshQualityField();
  syncWatermarkUI();
})();
