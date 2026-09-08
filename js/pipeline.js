/* Rendering pipeline: source image -> transform -> crop -> resize -> adjustments.
 * Non-destructive: every call rebuilds from state.originalImage. */
(function () {
  "use strict";

  const App = window.App;

  function newCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  // Source image with rotation + flip baked in.
  function transformedCanvas() {
    const s = App.state;
    const img = s.originalImage;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const rot = ((s.rotation % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const c = newCanvas(swap ? h : w, swap ? w : h);
    const ctx = c.getContext("2d");
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
    ctx.drawImage(img, -w / 2, -h / 2);
    return c;
  }
  App.transformedCanvas = transformedCanvas;

  // Full-resolution result canvas (transform + crop + resize + adjustments).
  App.composeCanvas = function () {
    const s = App.state;
    let c = transformedCanvas();

    if (s.crop) {
      const cr = s.crop;
      const cc = newCanvas(cr.w, cr.h);
      cc.getContext("2d").drawImage(c, cr.x, cr.y, cr.w, cr.h, 0, 0, cc.width, cc.height);
      c = cc;
    }

    if (s.resize && (s.resize.w !== c.width || s.resize.h !== c.height)) {
      const rc = newCanvas(s.resize.w, s.resize.h);
      const rx = rc.getContext("2d");
      rx.imageSmoothingEnabled = true;
      rx.imageSmoothingQuality = "high";
      rx.drawImage(c, 0, 0, rc.width, rc.height);
      c = rc;
    }

    if (!App.isAdjustDefault(s.adjust)) {
      const a = s.adjust;
      const ac = newCanvas(c.width, c.height);
      const ax = ac.getContext("2d");
      ax.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%) grayscale(${a.grayscale}%)`;
      ax.drawImage(c, 0, 0);
      c = ac;
    }

    // Zuletzt, damit das Wasserzeichen von Helligkeit/Sättigung unberührt bleibt.
    if (App.Watermark) App.Watermark.draw(c);

    return c;
  };

  // Size (in px) of the composed output, without actually rendering it.
  App.outputSize = function () {
    const s = App.state;
    if (s.resize) return { w: s.resize.w, h: s.resize.h };
    if (s.crop) return { w: Math.round(s.crop.w), h: Math.round(s.crop.h) };
    const t = transformedCanvas();
    return { w: t.width, h: t.height };
  };

  App.exportBlob = function () {
    const s = App.state;
    const canvas = App.composeCanvas();
    const quality = s.format === "image/png" ? undefined : s.quality;
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob lieferte null"))),
        s.format,
        quality
      );
    });
  };
})();
