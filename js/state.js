/* Global app namespace + editing state.
 * Loaded first. Everything hangs off window.App so the app works as plain
 * <script> files with no build step and no ES-module server requirement. */
(function () {
  "use strict";

  const App = (window.App = window.App || {});

  function defaultState() {
    return {
      originalImage: null, // HTMLImageElement, the untouched source
      fileName: "bild",

      // transform (applied before crop)
      rotation: 0, // 0 | 90 | 180 | 270
      flipH: false,
      flipV: false,

      // crop rectangle in *transformed image* pixel coordinates, or null
      crop: null, // { x, y, w, h }

      // adjustments (CSS filter percentages)
      adjust: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0 },

      // output resize, or null for "native size"
      resize: null, // { w, h }

      // export
      format: "image/png",
      quality: 0.92,
    };
  }

  App.state = defaultState();

  App.resetState = function () {
    const img = App.state.originalImage;
    const name = App.state.fileName;
    App.state = defaultState();
    App.state.originalImage = img;
    App.state.fileName = name;
  };

  App.isAdjustDefault = function (a) {
    return a.brightness === 100 && a.contrast === 100 && a.saturate === 100 && a.grayscale === 0;
  };
})();
