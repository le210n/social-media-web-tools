/* KI-Wasserzeichen im KraftMühle-CI.
 *
 * Alles ist Vektor: Kettlebell-Silhouette und die Buchstaben KI/AI sind als
 * Pfade gebaut, kein Webfont und kein Bild-Asset. Damit bleibt die App offline
 * lauffähig und das Zeichen ist in jeder Ausgabegröße scharf.
 *
 * Farben direkt von kraftmuehle-wuerzburg.de abgenommen:
 *   #b0cb0b  Grün der Wortmarke / des Kettlebell-Icons
 *   #021010  Anthrazit der Seitenfläche
 */
(function () {
  "use strict";

  const App = window.App;

  const GREEN = "#b0cb0b";
  const INK = "#0d1211"; // Website-Anthrazit, minimal aufgehellt fürs Zeichen

  const STYLES = {
    green: { body: GREEN, ink: INK, caption: GREEN },
    dark: { body: INK, ink: GREEN, caption: "#ffffff" },
    light: { body: "#ffffff", ink: INK, caption: "#ffffff" },
  };

  // Anteil links/oben im verfügbaren Raum je Position.
  const POSITIONS = {
    tl: [0, 0], tc: [0.5, 0], tr: [1, 0],
    ml: [0, 0.5], mc: [0.5, 0.5], mr: [1, 0.5],
    bl: [0, 1], bc: [0.5, 1], br: [1, 1],
  };

  /* ---------- Kettlebell ----------
   * Gezeichnet in einem 100x100-Raster, an realen Proportionen orientiert:
   * kugeliger Korpus mit flachem Stand, eingezogene Schulter, Griffbügel mit
   * trapezförmiger Öffnung, die unten von der Korpuskuppe begrenzt wird.
   * Sichtbare Ausdehnung: x 7..93, y 5..95.  */
  const BELL = { x: 10, y: 4, w: 80, h: 93 };

  function kettlebellPath() {
    const p = new Path2D();

    // Außenkontur ab der linken Standkante, gegen den Uhrzeigersinn.
    p.moveTo(24, 97);
    p.bezierCurveTo(15, 96.6, 10, 81, 10, 65); // Kugel unten links -> breiteste Stelle
    p.bezierCurveTo(10, 56, 12.4, 51, 14.6, 46); // Schulter läuft in den Schenkel
    p.bezierCurveTo(15, 40, 14.5, 33, 14.5, 27); // linker Bügelschenkel
    p.bezierCurveTo(14.5, 13, 30, 4, 50, 4); // Bügelbogen links
    p.bezierCurveTo(70, 4, 85.5, 13, 85.5, 27); // Bügelbogen rechts
    p.bezierCurveTo(85.5, 33, 85, 40, 85.4, 46);
    p.bezierCurveTo(87.6, 51, 90, 56, 90, 65);
    p.bezierCurveTo(90, 81, 85, 96.6, 76, 97);
    p.closePath();

    // Griffdurchbruch: breit und flach, unten von der Kugelkuppe begrenzt –
    // so sieht die Öffnung an einer echten Kettlebell aus (evenodd stanzt aus).
    p.moveTo(50, 16);
    p.bezierCurveTo(38, 16, 28.5, 20, 26.6, 28);
    p.bezierCurveTo(26.2, 31, 26, 34, 26.2, 37.5);
    p.bezierCurveTo(32, 29.5, 68, 29.5, 73.8, 37.5);
    p.bezierCurveTo(74, 34, 73.8, 31, 73.4, 28);
    p.bezierCurveTo(71.5, 20, 62, 16, 50, 16);
    p.closePath();

    return p;
  }

  /* ---------- Buchstaben ----------
   * Schmale, kräftige Versalien mit geraden Abschlüssen – die Anmutung der
   * Bebas Neue, mit der die Website ihre Headlines setzt. Koordinaten in
   * Versalhöhen: y 0 = Oberkante, y 1 = Grundlinie.
   * Alle Teilpfade laufen gleichsinnig, Zählerflächen gegenläufig (nonzero). */
  const STEM = 0.235;

  function glyphK() {
    const p = new Path2D();
    p.rect(0, 0, STEM, 1); // Stamm
    p.moveTo(0.41, 0); // oberer Arm
    p.lineTo(0.67, 0);
    p.lineTo(STEM, 0.684);
    p.lineTo(STEM, 0.276);
    p.closePath();
    p.moveTo(0.405, 1); // unteres Bein
    p.lineTo(STEM, 0.726);
    p.lineTo(STEM, 0.274);
    p.lineTo(0.685, 1);
    p.closePath();
    return { path: p, width: 0.685 };
  }

  function glyphA() {
    const p = new Path2D();
    p.moveTo(0.3, 0);
    p.lineTo(0.48, 0);
    p.lineTo(0.78, 1);
    p.lineTo(0.545, 1);
    p.lineTo(0.5015, 0.855); // Unterkante Querbalken
    p.lineTo(0.2785, 0.855);
    p.lineTo(0.235, 1);
    p.lineTo(0, 1);
    p.closePath();
    p.moveTo(0.39, 0.483); // Zähler, gegenläufig
    p.lineTo(0.319, 0.72);
    p.lineTo(0.461, 0.72);
    p.closePath();
    return { path: p, width: 0.78 };
  }

  function glyphI() {
    const p = new Path2D();
    p.rect(0, 0, STEM, 1);
    return { path: p, width: STEM };
  }

  const GLYPHS = { K: glyphK, A: glyphA, I: glyphI };
  const TRACKING = { KI: 0.1, AI: 0.06 };

  // Zeichnet das Kürzel mittig auf die Korpusfläche (wie die eingegossene
  // Gewichtsangabe auf einer echten Kettlebell).
  function drawMonogram(ctx, text, color) {
    const cap = 38; // Versalhöhe in Rasterpunkten
    const track = (TRACKING[text] != null ? TRACKING[text] : 0.1) * cap;
    const glyphs = [...text].map((ch) => (GLYPHS[ch] || glyphI)());
    const total = glyphs.reduce((sum, g) => sum + g.width * cap, 0) + track * (glyphs.length - 1);

    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(50 - total / 2, 68 - cap / 2); // Mitte der Kugelfläche
    glyphs.forEach((g) => {
      ctx.save();
      ctx.scale(cap, cap);
      ctx.fill(g.path);
      ctx.restore();
      ctx.translate(g.width * cap + track, 0);
    });
    ctx.restore();
  }

  /* ---------- Zusatzzeile ---------- */
  // Ohne Webfont steht keine echte Schmalschrift sicher zur Verfügung. Die
  // Zeile wird deshalb horizontal gestaucht – das trifft die schmale, laute
  // Versal-Anmutung der Website-Headlines deutlich besser als eine Grotesk
  // in Normalbreite.
  const CONDENSE = 0.84;

  function captionFont(size) {
    return `700 ${size}px "Bebas Neue", "Oswald", "Archivo Narrow", "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  }

  function trackedWidth(ctx, chars, spacing) {
    let w = 0;
    chars.forEach((c) => (w += ctx.measureText(c).width + spacing));
    return Math.max(0, w - spacing);
  }

  function drawTracked(ctx, chars, spacing, x, y) {
    chars.forEach((c) => {
      ctx.fillText(c, x, y);
      x += ctx.measureText(c).width + spacing;
    });
  }

  /* ---------- Marke als Offscreen-Canvas ----------
   * Erst komplett rendern, dann als Ganzes mit Schatten und Deckkraft aufs
   * Bild legen – so entstehen keine Schattenkanten zwischen den Teilformen. */
  function renderMark(height, opts) {
    const style = STYLES[opts.style] || STYLES.green;
    const text = opts.text === "AI" ? "AI" : "KI";
    const scale = height / BELL.h;
    const markW = BELL.w * scale;

    const caption = opts.caption ? String(opts.captionText || "").trim().toUpperCase() : "";
    const capChars = caption ? [...caption] : [];
    const capGap = height * 0.09;

    // Erste Messung braucht einen Kontext mit gesetzter Schrift. Lange Texte
    // werden verkleinert, damit die Zeile die Kettlebell nicht dominiert.
    const probe = document.createElement("canvas").getContext("2d");
    let capSize = Math.max(6, height * 0.15);
    let capTracking = capSize * 0.14;
    let capW = 0;
    if (caption) {
      probe.font = captionFont(capSize);
      capW = trackedWidth(probe, capChars, capTracking) * CONDENSE;
      const max = markW * 1.4;
      if (capW > max) {
        capSize = Math.max(6, (capSize * max) / capW);
        capTracking = capSize * 0.14;
        probe.font = captionFont(capSize);
        capW = trackedWidth(probe, capChars, capTracking) * CONDENSE;
      }
    }

    const w = Math.ceil(Math.max(markW, capW));
    const h = Math.ceil(height + (caption ? capGap + capSize * 1.05 : 0));

    const c = document.createElement("canvas");
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    const ctx = c.getContext("2d");

    ctx.save();
    ctx.translate((w - markW) / 2, 0);
    ctx.scale(scale, scale);
    ctx.translate(-BELL.x, -BELL.y);
    ctx.fillStyle = style.body;
    ctx.fill(kettlebellPath(), "evenodd");
    drawMonogram(ctx, text, style.ink);
    ctx.restore();

    if (caption) {
      ctx.save();
      ctx.fillStyle = style.caption;
      ctx.font = captionFont(capSize);
      ctx.textBaseline = "top";
      ctx.translate((w - capW) / 2, height + capGap);
      ctx.scale(CONDENSE, 1);
      drawTracked(ctx, capChars, capTracking, 0, 0);
      ctx.restore();
    }

    return c;
  }

  /* ---------- Auf ein Bild-Canvas legen ---------- */
  function draw(canvas, opts) {
    const o = opts || App.state.watermark;
    if (!o || !o.enabled) return canvas;

    const W = canvas.width;
    const H = canvas.height;
    const base = Math.min(W, H);
    const markH = Math.max(12, Math.round((base * o.size) / 100));
    const margin = Math.round((base * 4) / 100);

    const mark = renderMark(markH, o);
    const [fx, fy] = POSITIONS[o.position] || POSITIONS.br;
    const x = margin + Math.max(0, W - 2 * margin - mark.width) * fx;
    const y = margin + Math.max(0, H - 2 * margin - mark.height) * fy;

    const ctx = canvas.getContext("2d");
    ctx.save();
    // Die Pipeline hinterlässt auf ihren Kontexten Transformationen und
    // Filter – beides muss hier weg, sonst landet die Marke daneben bzw.
    // würde von den Bildanpassungen mit eingefärbt.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = Math.max(0.05, Math.min(1, o.opacity / 100));
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = markH * 0.07;
    ctx.shadowOffsetY = markH * 0.02;
    ctx.drawImage(mark, Math.round(x), Math.round(y));
    ctx.restore();
    return canvas;
  }

  App.Watermark = { draw, renderMark, STYLES };
})();
