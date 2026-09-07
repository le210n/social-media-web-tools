/* Crop overlay controller. Works in on-screen (display) pixels and converts to
 * transformed-image pixels on apply(). Pointer-events based (mouse + touch). */
(function () {
  "use strict";

  const App = window.App;
  const MIN = 24;

  const Crop = (App.Crop = {
    active: false,
    ratio: null, // width / height, or null for free
    rect: { x: 0, y: 0, w: 0, h: 0 }, // display px, relative to layer
    _els: null,
    onApply: null,
  });

  Crop.init = function (els) {
    Crop._els = els;
    const box = els.box;

    box.addEventListener("pointerdown", (e) => startDrag(e, "move"));
    box.querySelectorAll(".handle").forEach((h) => {
      const corner = h.classList[1]; // nw | ne | sw | se
      h.addEventListener("pointerdown", (e) => startDrag(e, corner));
    });
  };

  Crop.setRatio = function (value) {
    if (value === "free") {
      Crop.ratio = null;
    } else if (value === "original") {
      const t = App.transformedCanvas();
      Crop.ratio = t.width / t.height;
    } else {
      const [a, b] = value.split(":").map(parseFloat);
      Crop.ratio = a / b;
    }
    if (Crop.active) {
      resetRectToRatio();
      render();
    }
  };

  Crop.enter = function () {
    const els = Crop._els;
    Crop.active = true;
    els.layer.hidden = false;

    if (App.state.crop) {
      const sc = displayScale();
      const c = App.state.crop;
      Crop.rect = { x: c.x * sc, y: c.y * sc, w: c.w * sc, h: c.h * sc };
    } else {
      resetRectToRatio();
    }
    _lastLayer = layerSize();
    render();
  };

  Crop.exit = function () {
    Crop.active = false;
    Crop._els.layer.hidden = true;
  };

  Crop.apply = function () {
    const sc = displayScale();
    const r = Crop.rect;
    const t = App.transformedCanvas();
    const crop = {
      x: clamp(Math.round(r.x / sc), 0, t.width - 1),
      y: clamp(Math.round(r.y / sc), 0, t.height - 1),
      w: Math.round(r.w / sc),
      h: Math.round(r.h / sc),
    };
    crop.w = clamp(crop.w, 1, t.width - crop.x);
    crop.h = clamp(crop.h, 1, t.height - crop.y);
    App.state.crop = crop;
    App.state.resize = null; // dimensions changed
    Crop.exit();
    if (Crop.onApply) Crop.onApply();
  };

  Crop.clearCrop = function () {
    App.state.crop = null;
    Crop.exit();
    if (Crop.onApply) Crop.onApply();
  };

  // ---- internals ----

  function layerSize() {
    const el = Crop._els.layer;
    return { w: el.clientWidth, h: el.clientHeight };
  }

  function displayScale() {
    // display px per transformed-image px
    return Crop._els.layer.clientWidth / App.transformedCanvas().width;
  }

  function resetRectToRatio() {
    const { w: LW, h: LH } = layerSize();
    let w = LW * 0.9;
    let h = LH * 0.9;
    if (Crop.ratio) {
      if (w / h > Crop.ratio) w = h * Crop.ratio;
      else h = w / Crop.ratio;
    }
    Crop.rect = { x: (LW - w) / 2, y: (LH - h) / 2, w, h };
  }

  function render() {
    const b = Crop._els.box;
    const r = Crop.rect;
    b.style.left = r.x + "px";
    b.style.top = r.y + "px";
    b.style.width = r.w + "px";
    b.style.height = r.h + "px";
  }

  let drag = null;
  let _lastLayer = null;

  function startDrag(e, mode) {
    e.preventDefault();
    e.stopPropagation();
    drag = { mode, sx: e.clientX, sy: e.clientY, r0: { ...Crop.rect } };
    e.target.setPointerCapture(e.pointerId);
    e.target.addEventListener("pointermove", onMove);
    e.target.addEventListener("pointerup", onUp);
    e.target.addEventListener("pointercancel", onUp);
  }

  function onMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    const { w: LW, h: LH } = layerSize();

    if (drag.mode === "move") {
      Crop.rect.x = clamp(drag.r0.x + dx, 0, LW - drag.r0.w);
      Crop.rect.y = clamp(drag.r0.y + dy, 0, LH - drag.r0.h);
    } else {
      resizeCorner(drag.mode, drag.r0, dx, dy, LW, LH);
    }
    render();
  }

  function onUp(e) {
    drag = null;
    e.target.removeEventListener("pointermove", onMove);
    e.target.removeEventListener("pointerup", onUp);
    e.target.removeEventListener("pointercancel", onUp);
  }

  function resizeCorner(corner, r0, dx, dy, LW, LH) {
    const dirX = corner === "nw" || corner === "sw" ? -1 : 1;
    const dirY = corner === "nw" || corner === "ne" ? -1 : 1;
    const ax = dirX > 0 ? r0.x : r0.x + r0.w; // anchored (fixed) corner
    const ay = dirY > 0 ? r0.y : r0.y + r0.h;

    let w = clamp(r0.w + dirX * dx, MIN, dirX > 0 ? LW - ax : ax);
    let h = clamp(r0.h + dirY * dy, MIN, dirY > 0 ? LH - ay : ay);

    if (Crop.ratio) {
      h = w / Crop.ratio;
      const maxH = dirY > 0 ? LH - ay : ay;
      if (h > maxH) {
        h = maxH;
        w = h * Crop.ratio;
      }
      if (h < MIN) {
        h = MIN;
        w = h * Crop.ratio;
      }
    }

    Crop.rect = {
      w,
      h,
      x: dirX > 0 ? ax : ax - w,
      y: dirY > 0 ? ay : ay - h,
    };
  }

  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  // Keep the on-screen selection proportional when the preview is re-fitted
  // (e.g. window resize) while cropping is active.
  Crop.reflow = function () {
    if (!Crop.active) return;
    const now = layerSize();
    if (_lastLayer && _lastLayer.w && now.w && (_lastLayer.w !== now.w || _lastLayer.h !== now.h)) {
      const sx = now.w / _lastLayer.w;
      const sy = now.h / _lastLayer.h;
      Crop.rect = {
        x: Crop.rect.x * sx,
        y: Crop.rect.y * sy,
        w: Crop.rect.w * sx,
        h: Crop.rect.h * sy,
      };
    }
    _lastLayer = now;
    render();
  };
})();
