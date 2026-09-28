(function () {
  "use strict";

  const fileInput = document.getElementById("ppt-file");
  if (!fileInput) return;

  const maxDimension = document.getElementById("ppt-max-dimension");
  const qualityInput = document.getElementById("ppt-quality");
  const status = document.getElementById("ppt-status");
  const button = document.getElementById("reduce-ppt");
  const fileSelection = document.getElementById("ppt-file-selection");
  const maxFileSize = 100 * 1024 * 1024;
  document.getElementById("ppt-max-value").value = maxDimension.value;
  document.getElementById("ppt-quality-value").value = qualityInput.value;

  maxDimension.addEventListener("input", () => {
    document.getElementById("ppt-max-value").value = maxDimension.value;
  });
  qualityInput.addEventListener("input", () => {
    document.getElementById("ppt-quality-value").value = qualityInput.value;
  });

  function report(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  fileInput.addEventListener("change", () => {
    fileSelection.textContent = fileInput.files.length
      ? `Selected: ${fileInput.files[0].name}`
      : "No presentation selected.";
  });

  function canvasBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode an embedded image."));
      }, type, quality);
    });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  button.addEventListener("click", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      report("Choose a .pptx file first.", true);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      report("Only modern .pptx presentations are supported. Legacy .ppt files cannot be optimized here.", true);
      return;
    }
    if (file.size > maxFileSize) {
      report("This presentation is larger than the 100 MB browser-processing limit.", true);
      return;
    }
    if (!window.JSZip || typeof window.createImageBitmap !== "function") {
      report("A required ZIP or image-processing feature is unavailable in this browser.", true);
      return;
    }

    button.disabled = true;
    report("Opening presentation…", false);
    try {
      const archive = await JSZip.loadAsync(file);
      const mediaEntries = Object.values(archive.files).filter((entry) =>
        !entry.dir && /^ppt\/media\/.+\.(?:png|jpe?g)$/i.test(entry.name)
      );
      if (!mediaEntries.length) {
        throw new Error("No embedded JPEG or PNG images were found to optimize.");
      }

      let updatedImages = 0;
      let savedBytes = 0;
      let checkedImages = 0;
      const maxEdge = Number(maxDimension.value);
      const quality = Number(qualityInput.value) / 100;

      for (const entry of mediaEntries) {
        checkedImages += 1;
        report(`Optimizing image ${checkedImages} of ${mediaEntries.length}…`, false);
        const originalBytes = await entry.async("uint8array");
        if (originalBytes.byteLength > 35 * 1024 * 1024) continue;
        const isJpeg = /\.jpe?g$/i.test(entry.name);
        const type = isJpeg ? "image/jpeg" : "image/png";
        let bitmap;
        try {
          bitmap = await createImageBitmap(new Blob([originalBytes], { type }));
        } catch (error) {
          continue;
        }

        try {
          const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
          const width = Math.max(1, Math.round(bitmap.width * scale));
          const height = Math.max(1, Math.round(bitmap.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) continue;
          context.drawImage(bitmap, 0, 0, width, height);
          const optimized = await canvasBlob(canvas, type, quality);
          if (optimized.size < originalBytes.byteLength) {
            archive.file(entry.name, optimized);
            updatedImages += 1;
            savedBytes += originalBytes.byteLength - optimized.size;
          }
        } finally {
          bitmap.close();
        }
      }

      if (!updatedImages) {
        report(`Checked ${checkedImages} embedded images; none became smaller with these settings. Try a lower image dimension or JPEG quality.`, false);
        return;
      }

      report("Rebuilding presentation…", false);
      const output = await archive.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const baseName = file.name.replace(/\.pptx$/i, "") || "presentation";
      download(output, `${baseName}_reduced.pptx`);
      const changePercent = ((file.size - output.size) / file.size) * 100;
      const changeMessage = changePercent >= 0
        ? `overall PPTX reduced by ${changePercent.toFixed(1)}%`
        : `overall PPTX grew by ${Math.abs(changePercent).toFixed(1)}%`;
      report(`Done. Optimized ${updatedImages} image${updatedImages === 1 ? "" : "s"} (${(savedBytes / 1024 / 1024).toFixed(2)} MB saved from image data); ${changeMessage}.`, false);
    } catch (error) {
      report(error instanceof Error ? error.message : "Could not reduce this presentation.", true);
    } finally {
      button.disabled = false;
    }
  });
})();
