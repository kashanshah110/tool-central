/*!
 * compressor.js — ToolCentral
 * Browser-only image compression engine. No network calls, no uploads.
 * Exposes `window.ImageCompressor` with a small, dependency-free API built
 * on the Canvas 2D API. All work happens on the visitor's device.
 */
(function (global) {
  "use strict";

  const SUPPORTED_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function inputMimeType(file) {
    if (SUPPORTED_INPUT_TYPES.includes(file.type)) return file.type;
    if (file.type && file.type !== "application/octet-stream" && file.type !== "image/jpg") {
      return null;
    }
    const extension = file.name.toLowerCase().match(/\.([^.]+)$/);
    if (!extension) return null;
    if (extension[1] === "jpg" || extension[1] === "jpeg") return "image/jpeg";
    if (extension[1] === "png") return "image/png";
    if (extension[1] === "webp") return "image/webp";
    return null;
  }

  /**
   * Feature-detect whether the browser can actually *encode* WebP via
   * canvas.toBlob (support for encoding lags behind support for decoding
   * on a few older browsers/WebViews).
   */
  function detectWebpEncodeSupport() {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 2;
        canvas.height = 2;
        canvas.toBlob(
          (blob) => resolve(!!blob && blob.type === "image/webp"),
          "image/webp",
          0.8
        );
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Decode a File into an ImageBitmap, honoring embedded EXIF orientation
   * where the browser supports it so the output image is upright without
   * us needing to hand-roll EXIF parsing.
   */
  async function decodeImage(file) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (e) {
        // Some browsers reject the option object or the file itself
        // (e.g. certain PNG color profiles). Fall through to <img>.
      }
    }
    return await decodeViaImageElement(file);
  }

  function decodeViaImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("This file could not be read as an image."));
      };
      img.src = url;
    });
  }

  function drawToCanvas(source, maxDimension) {
    let { width, height } = getSourceDimensions(source);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      throw new Error("The browser could not read this image's dimensions.");
    }
    if (maxDimension && Math.max(width, height) > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("The browser could not create an image canvas. Try a smaller image or another browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  function getSourceDimensions(source) {
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      return { width: source.width, height: source.height };
    }
    return { width: source.naturalWidth, height: source.naturalHeight };
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("The browser could not encode this image."));
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * Quick scan for an alpha channel by sampling pixel data. Used to decide
   * whether to warn the visitor about losing transparency on conversion.
   */
  function canvasHasTransparency(canvas) {
    const sampleSize = 64;
    const sample = document.createElement("canvas");
    sample.width = Math.min(sampleSize, canvas.width);
    sample.height = Math.min(sampleSize, canvas.height);
    const ctx = sample.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("The browser could not inspect image transparency.");
    ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
    const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
    for (let idx = 3; idx < data.length; idx += 4) {
      if (data[idx] < 255) {
        return true;
      }
    }
    return false;
  }

  /**
   * Compress a single image file.
   *
   * @param {File} file
   * @param {Object} options
   * @param {number} options.quality        0–1, applies to JPEG/WebP only
   * @param {"keep"|"jpeg"|"webp"} options.outputFormat
   * @param {number} [options.maxDimension] longest-edge cap in pixels
   * @param {boolean} [options.webpSupported]
   * @param {(progress:number)=>void} [options.onProgress] 0–100
   * @returns {Promise<{
   *   blob: Blob, url: string, mimeType: string, width: number,
   *   height: number, originalSize: number, compressedSize: number,
   *   hadTransparency: boolean, keptTransparency: boolean,
   *   note: string|null
   * }>}
   */
  async function compressImage(file, options) {
    const opts = Object.assign(
      { quality: 0.75, outputFormat: "keep", maxDimension: 4096 },
      options || {}
    );
    if (typeof opts.onProgress === "function") opts.onProgress(10);

    const sourceMime = inputMimeType(file);
    if (!sourceMime) {
      throw new Error(
        "Unsupported file type. Please use JPG, PNG, or WebP images."
      );
    }

    const source = await decodeImage(file);
    if (typeof opts.onProgress === "function") opts.onProgress(40);

    let canvas;
    try {
      canvas = drawToCanvas(source, opts.maxDimension);
    } finally {
      if (typeof source.close === "function") source.close();
    }

    const hadTransparency =
      sourceMime === "image/png" || sourceMime === "image/webp"
        ? canvasHasTransparency(canvas)
        : false;

    if (typeof opts.onProgress === "function") opts.onProgress(60);

    let targetMime = sourceMime;
    let note = null;

    if (opts.outputFormat === "jpeg") {
      targetMime = "image/jpeg";
    } else if (opts.outputFormat === "webp") {
      if (opts.webpSupported) {
        targetMime = "image/webp";
      } else {
        targetMime = sourceMime === "image/png" ? "image/png" : "image/jpeg";
        note =
          "This browser can't encode WebP, so the original format was kept instead.";
      }
    } else {
      // "keep": PNG stays PNG, JPEG stays JPEG, WebP stays WebP.
      targetMime = sourceMime;
    }

    const willLoseTransparency =
      hadTransparency && targetMime === "image/jpeg";
    if (willLoseTransparency) {
      note =
        "This image had transparency, which JPEG can't store — the transparent areas were filled with white.";
      // Flatten onto white before encoding so the visitor sees the real
      // result rather than an unexpected black background.
      const ctx = canvas.getContext("2d");
      const flattened = document.createElement("canvas");
      flattened.width = canvas.width;
      flattened.height = canvas.height;
      const fctx = flattened.getContext("2d");
      fctx.fillStyle = "#ffffff";
      fctx.fillRect(0, 0, flattened.width, flattened.height);
      fctx.drawImage(canvas, 0, 0);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      canvas.getContext("2d").drawImage(flattened, 0, 0);
    }

    const usesQuality = targetMime === "image/jpeg" || targetMime === "image/webp";
    const quality = usesQuality ? opts.quality : undefined;

    if (targetMime === "image/png" && !note) {
      note =
        "PNG is lossless in the browser, so quality re-encoding mainly strips extra data rather than shrinking pixels a lot. Convert to WebP for bigger savings if transparency isn't essential.";
    }

    const blob = await canvasToBlob(canvas, targetMime, quality);
    if (typeof opts.onProgress === "function") opts.onProgress(90);

    const url = URL.createObjectURL(blob);
    if (typeof opts.onProgress === "function") opts.onProgress(100);

    return {
      blob,
      url,
      mimeType: targetMime,
      width: canvas.width,
      height: canvas.height,
      originalSize: file.size,
      compressedSize: blob.size,
      hadTransparency,
      keptTransparency: hadTransparency && targetMime !== "image/jpeg",
      note,
    };
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value < 10 ? 2 : 1)} ${units[unitIndex]}`;
  }

  function percentChange(originalSize, compressedSize) {
    if (!originalSize) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  function extensionFor(mimeType) {
    switch (mimeType) {
      case "image/jpeg":
        return "jpg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      default:
        return "img";
    }
  }

  function baseName(fileName) {
    const idx = fileName.lastIndexOf(".");
    return idx > 0 ? fileName.slice(0, idx) : fileName;
  }

  global.ImageCompressor = {
    SUPPORTED_INPUT_TYPES,
    inputMimeType,
    detectWebpEncodeSupport,
    compressImage,
    formatBytes,
    percentChange,
    extensionFor,
    baseName,
  };
})(window);
